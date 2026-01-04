use clap::Parser;
use std::path::PathBuf;

/// Packet Capture CLI Tool
///
/// A command-line packet capture tool that allows filtering by interface,
/// protocol, port, source, and destination addresses.
#[derive(Parser, Debug, Clone)]
#[command(name = "packet-capture")]
#[command(author = "Developer")]
#[command(version = "0.1.0")]
#[command(about = "A CLI packet capture tool with filtering capabilities")]
pub struct Args {
    /// Network interface to capture packets from (e.g., eth0, wlan0)
    #[arg(short, long)]
    pub interface: Option<String>,

    /// Protocol to filter (tcp, udp, icmp, all)
    #[arg(short, long, default_value = "all")]
    pub protocol: String,

    /// Port number to filter (applies to TCP/UDP)
    #[arg(short = 'P', long)]
    pub port: Option<u16>,

    /// Source IP address to filter
    #[arg(short, long)]
    pub source: Option<String>,

    /// Destination IP address to filter
    #[arg(short, long)]
    pub destination: Option<String>,

    /// Output file path for captured packets
    #[arg(short, long, default_value = "capture.pcap")]
    pub output: PathBuf,

    /// Configuration file path
    #[arg(short, long)]
    pub config: Option<PathBuf>,

    /// Maximum number of packets to capture (0 for unlimited)
    #[arg(short = 'n', long, default_value = "0")]
    pub max_packets: usize,

    /// List available network interfaces and exit
    #[arg(short, long)]
    pub list_interfaces: bool,

    /// Enable verbose output
    #[arg(short, long)]
    pub verbose: bool,
}

impl Args {
    pub fn parse_args() -> Self {
        Args::parse()
    }
}
