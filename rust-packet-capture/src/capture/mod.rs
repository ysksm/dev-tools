use anyhow::{Context, Result};
use chrono::Utc;
use log::{debug, info, warn};
use pnet::datalink::{self, Channel::Ethernet, NetworkInterface};
use pnet::packet::ethernet::{EtherTypes, EthernetPacket};
use pnet::packet::ip::IpNextHeaderProtocols;
use pnet::packet::ipv4::Ipv4Packet;
use pnet::packet::ipv6::Ipv6Packet;
use pnet::packet::tcp::TcpPacket;
use pnet::packet::udp::UdpPacket;
use pnet::packet::Packet;
use std::net::IpAddr;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use crate::config::Config;
use crate::filter::{PacketFilter, Protocol};
use crate::output::{CapturedPacket, PcapWriter};

/// List all available network interfaces
pub fn list_interfaces() -> Vec<NetworkInterface> {
    datalink::interfaces()
}

/// Print available network interfaces
pub fn print_interfaces() {
    let interfaces = list_interfaces();
    println!("Available network interfaces:");
    println!("{:-<60}", "");

    for iface in interfaces {
        let ips: Vec<String> = iface.ips.iter().map(|ip| ip.to_string()).collect();
        let ip_str = if ips.is_empty() {
            "No IP".to_string()
        } else {
            ips.join(", ")
        };

        let status = if iface.is_up() { "UP" } else { "DOWN" };
        let flags = if iface.is_loopback() {
            " (loopback)"
        } else {
            ""
        };

        println!(
            "  {:<15} [{:<4}]{} - {}",
            iface.name, status, flags, ip_str
        );
    }
    println!("{:-<60}", "");
}

/// Get a network interface by name
pub fn get_interface(name: &str) -> Option<NetworkInterface> {
    list_interfaces().into_iter().find(|i| i.name == name)
}

/// Get the default interface (first non-loopback interface that is up)
pub fn get_default_interface() -> Option<NetworkInterface> {
    list_interfaces()
        .into_iter()
        .find(|i| i.is_up() && !i.is_loopback() && !i.ips.is_empty())
}

/// Packet capture engine
pub struct CaptureEngine {
    interface: NetworkInterface,
    filter: PacketFilter,
    writer: PcapWriter,
    max_packets: usize,
    verbose: bool,
    running: Arc<AtomicBool>,
}

impl CaptureEngine {
    /// Create a new capture engine
    pub fn new(config: &Config, running: Arc<AtomicBool>) -> Result<Self> {
        // Get the interface
        let interface = if let Some(name) = &config.interface {
            get_interface(name)
                .with_context(|| format!("Interface '{}' not found", name))?
        } else {
            get_default_interface()
                .context("No suitable network interface found. Use -l to list interfaces.")?
        };

        info!("Using interface: {}", interface.name);

        // Create packet filter
        let filter = PacketFilter::from_config(config)
            .map_err(|e| anyhow::anyhow!("Filter error: {}", e))?;

        info!("Active filter: {}", filter);

        // Create PCAP writer
        let writer = PcapWriter::new(&config.output)?;
        info!("Output file: {:?}", config.output);

        Ok(CaptureEngine {
            interface,
            filter,
            writer,
            max_packets: config.max_packets,
            verbose: config.verbose,
            running,
        })
    }

    /// Start capturing packets
    pub fn run(&mut self) -> Result<()> {
        let (_, mut rx) = match datalink::channel(&self.interface, Default::default()) {
            Ok(Ethernet(tx, rx)) => (tx, rx),
            Ok(_) => return Err(anyhow::anyhow!("Unsupported channel type")),
            Err(e) => {
                return Err(anyhow::anyhow!(
                    "Failed to create datalink channel: {}. \
                     Note: Packet capture requires root/administrator privileges.",
                    e
                ))
            }
        };

        info!("Starting packet capture on {}...", self.interface.name);
        info!("Press Ctrl+C to stop capturing.");

        let mut packet_count = 0;

        while self.running.load(Ordering::SeqCst) {
            match rx.next() {
                Ok(packet) => {
                    if let Some(captured) = self.process_packet(packet) {
                        // Get timestamp
                        let now = Utc::now();
                        let secs = now.timestamp() as u32;
                        let usecs = now.timestamp_subsec_micros();

                        // Write to PCAP file
                        self.writer.write_packet(secs, usecs, packet)?;

                        packet_count += 1;

                        if self.verbose {
                            println!("{}", captured);
                        } else if packet_count % 100 == 0 {
                            print!("\rCaptured {} packets...", packet_count);
                            std::io::Write::flush(&mut std::io::stdout())?;
                        }

                        // Check if we've reached the max packets limit
                        if self.max_packets > 0 && packet_count >= self.max_packets {
                            info!("\nReached maximum packet count: {}", self.max_packets);
                            break;
                        }
                    }
                }
                Err(e) => {
                    warn!("Error receiving packet: {}", e);
                }
            }
        }

        // Final flush
        self.writer.flush()?;

        println!("\n{:-<60}", "");
        println!("Capture complete!");
        println!("  Packets captured: {}", self.writer.packet_count());
        println!("{:-<60}", "");

        Ok(())
    }

    /// Process a raw ethernet packet
    fn process_packet(&self, ethernet_data: &[u8]) -> Option<CapturedPacket> {
        let ethernet = EthernetPacket::new(ethernet_data)?;

        match ethernet.get_ethertype() {
            EtherTypes::Ipv4 => self.process_ipv4(&ethernet),
            EtherTypes::Ipv6 => self.process_ipv6(&ethernet),
            _ => {
                debug!("Skipping non-IP packet: {:?}", ethernet.get_ethertype());
                None
            }
        }
    }

    /// Process an IPv4 packet
    fn process_ipv4(&self, ethernet: &EthernetPacket) -> Option<CapturedPacket> {
        let ipv4 = Ipv4Packet::new(ethernet.payload())?;
        let src_ip = IpAddr::V4(ipv4.get_source());
        let dst_ip = IpAddr::V4(ipv4.get_destination());

        let (protocol, src_port, dst_port) = match ipv4.get_next_level_protocol() {
            IpNextHeaderProtocols::Tcp => {
                if let Some(tcp) = TcpPacket::new(ipv4.payload()) {
                    (
                        Protocol::Tcp,
                        Some(tcp.get_source()),
                        Some(tcp.get_destination()),
                    )
                } else {
                    return None;
                }
            }
            IpNextHeaderProtocols::Udp => {
                if let Some(udp) = UdpPacket::new(ipv4.payload()) {
                    (
                        Protocol::Udp,
                        Some(udp.get_source()),
                        Some(udp.get_destination()),
                    )
                } else {
                    return None;
                }
            }
            IpNextHeaderProtocols::Icmp => (Protocol::Icmp, None, None),
            _ => {
                debug!(
                    "Skipping unsupported protocol: {:?}",
                    ipv4.get_next_level_protocol()
                );
                return None;
            }
        };

        // Apply filter
        if !self.filter.matches(protocol, src_ip, dst_ip, src_port, dst_port) {
            return None;
        }

        Some(CapturedPacket {
            timestamp: Utc::now(),
            protocol: format!("{:?}", protocol),
            src_ip: src_ip.to_string(),
            dst_ip: dst_ip.to_string(),
            src_port,
            dst_port,
            length: ethernet.packet().len(),
        })
    }

    /// Process an IPv6 packet
    fn process_ipv6(&self, ethernet: &EthernetPacket) -> Option<CapturedPacket> {
        let ipv6 = Ipv6Packet::new(ethernet.payload())?;
        let src_ip = IpAddr::V6(ipv6.get_source());
        let dst_ip = IpAddr::V6(ipv6.get_destination());

        let (protocol, src_port, dst_port) = match ipv6.get_next_header() {
            IpNextHeaderProtocols::Tcp => {
                if let Some(tcp) = TcpPacket::new(ipv6.payload()) {
                    (
                        Protocol::Tcp,
                        Some(tcp.get_source()),
                        Some(tcp.get_destination()),
                    )
                } else {
                    return None;
                }
            }
            IpNextHeaderProtocols::Udp => {
                if let Some(udp) = UdpPacket::new(ipv6.payload()) {
                    (
                        Protocol::Udp,
                        Some(udp.get_source()),
                        Some(udp.get_destination()),
                    )
                } else {
                    return None;
                }
            }
            IpNextHeaderProtocols::Icmpv6 => (Protocol::Icmp, None, None),
            _ => {
                debug!(
                    "Skipping unsupported IPv6 protocol: {:?}",
                    ipv6.get_next_header()
                );
                return None;
            }
        };

        // Apply filter
        if !self.filter.matches(protocol, src_ip, dst_ip, src_port, dst_port) {
            return None;
        }

        Some(CapturedPacket {
            timestamp: Utc::now(),
            protocol: format!("{:?}", protocol),
            src_ip: src_ip.to_string(),
            dst_ip: dst_ip.to_string(),
            src_port,
            dst_port,
            length: ethernet.packet().len(),
        })
    }
}
