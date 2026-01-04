use std::net::IpAddr;
use std::str::FromStr;

use crate::config::Config;

/// Supported protocols for filtering
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Protocol {
    Tcp,
    Udp,
    Icmp,
    All,
}

impl FromStr for Protocol {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "tcp" => Ok(Protocol::Tcp),
            "udp" => Ok(Protocol::Udp),
            "icmp" => Ok(Protocol::Icmp),
            "all" => Ok(Protocol::All),
            _ => Err(format!("Unknown protocol: {}", s)),
        }
    }
}

/// Packet filter based on configuration
#[derive(Debug, Clone)]
pub struct PacketFilter {
    pub protocol: Protocol,
    pub port: Option<u16>,
    pub source: Option<IpAddr>,
    pub destination: Option<IpAddr>,
}

impl PacketFilter {
    /// Create a new packet filter from configuration
    pub fn from_config(config: &Config) -> Result<Self, String> {
        let protocol = Protocol::from_str(&config.protocol)?;

        let source = config
            .source
            .as_ref()
            .map(|s| {
                IpAddr::from_str(s).map_err(|e| format!("Invalid source IP address: {}", e))
            })
            .transpose()?;

        let destination = config
            .destination
            .as_ref()
            .map(|d| {
                IpAddr::from_str(d).map_err(|e| format!("Invalid destination IP address: {}", e))
            })
            .transpose()?;

        Ok(PacketFilter {
            protocol,
            port: config.port,
            source,
            destination,
        })
    }

    /// Check if a packet matches the filter criteria
    pub fn matches(
        &self,
        protocol: Protocol,
        src_ip: IpAddr,
        dst_ip: IpAddr,
        src_port: Option<u16>,
        dst_port: Option<u16>,
    ) -> bool {
        // Check protocol
        if self.protocol != Protocol::All && self.protocol != protocol {
            return false;
        }

        // Check source IP
        if let Some(filter_src) = &self.source {
            if src_ip != *filter_src {
                return false;
            }
        }

        // Check destination IP
        if let Some(filter_dst) = &self.destination {
            if dst_ip != *filter_dst {
                return false;
            }
        }

        // Check port (either source or destination port matches)
        if let Some(filter_port) = self.port {
            let port_matches = src_port == Some(filter_port) || dst_port == Some(filter_port);
            if !port_matches {
                return false;
            }
        }

        true
    }
}

impl std::fmt::Display for PacketFilter {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Filter[")?;
        write!(f, "protocol={:?}", self.protocol)?;
        if let Some(port) = self.port {
            write!(f, ", port={}", port)?;
        }
        if let Some(src) = &self.source {
            write!(f, ", src={}", src)?;
        }
        if let Some(dst) = &self.destination {
            write!(f, ", dst={}", dst)?;
        }
        write!(f, "]")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::Ipv4Addr;

    #[test]
    fn test_protocol_from_str() {
        assert_eq!(Protocol::from_str("tcp").unwrap(), Protocol::Tcp);
        assert_eq!(Protocol::from_str("TCP").unwrap(), Protocol::Tcp);
        assert_eq!(Protocol::from_str("udp").unwrap(), Protocol::Udp);
        assert_eq!(Protocol::from_str("icmp").unwrap(), Protocol::Icmp);
        assert_eq!(Protocol::from_str("all").unwrap(), Protocol::All);
        assert!(Protocol::from_str("invalid").is_err());
    }

    #[test]
    fn test_filter_matches() {
        let filter = PacketFilter {
            protocol: Protocol::Tcp,
            port: Some(80),
            source: None,
            destination: None,
        };

        let src = IpAddr::V4(Ipv4Addr::new(192, 168, 1, 1));
        let dst = IpAddr::V4(Ipv4Addr::new(10, 0, 0, 1));

        // Should match TCP on port 80
        assert!(filter.matches(Protocol::Tcp, src, dst, Some(12345), Some(80)));

        // Should not match UDP
        assert!(!filter.matches(Protocol::Udp, src, dst, Some(12345), Some(80)));

        // Should not match different port
        assert!(!filter.matches(Protocol::Tcp, src, dst, Some(12345), Some(443)));
    }
}
