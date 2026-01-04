use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

use crate::cli::Args;

/// Configuration structure for packet capture
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// Network interface to capture packets from
    #[serde(default)]
    pub interface: Option<String>,

    /// Protocol to filter (tcp, udp, icmp, all)
    #[serde(default = "default_protocol")]
    pub protocol: String,

    /// Port number to filter
    #[serde(default)]
    pub port: Option<u16>,

    /// Source IP address to filter
    #[serde(default)]
    pub source: Option<String>,

    /// Destination IP address to filter
    #[serde(default)]
    pub destination: Option<String>,

    /// Output file path
    #[serde(default = "default_output")]
    pub output: PathBuf,

    /// Maximum number of packets to capture
    #[serde(default)]
    pub max_packets: usize,

    /// Enable verbose output
    #[serde(default)]
    pub verbose: bool,
}

fn default_protocol() -> String {
    "all".to_string()
}

fn default_output() -> PathBuf {
    PathBuf::from("capture.pcap")
}

impl Default for Config {
    fn default() -> Self {
        Config {
            interface: None,
            protocol: default_protocol(),
            port: None,
            source: None,
            destination: None,
            output: default_output(),
            max_packets: 0,
            verbose: false,
        }
    }
}

impl Config {
    /// Load configuration from a TOML file
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        let content = fs::read_to_string(path.as_ref())
            .with_context(|| format!("Failed to read config file: {:?}", path.as_ref()))?;
        let config: Config =
            toml::from_str(&content).with_context(|| "Failed to parse config file")?;
        Ok(config)
    }

    /// Create configuration from CLI arguments, optionally merging with a config file
    pub fn from_args(args: &Args) -> Result<Self> {
        let mut config = if let Some(config_path) = &args.config {
            Self::from_file(config_path)?
        } else {
            Config::default()
        };

        // CLI arguments override config file values
        if args.interface.is_some() {
            config.interface = args.interface.clone();
        }
        if args.protocol != "all" {
            config.protocol = args.protocol.clone();
        }
        if args.port.is_some() {
            config.port = args.port;
        }
        if args.source.is_some() {
            config.source = args.source.clone();
        }
        if args.destination.is_some() {
            config.destination = args.destination.clone();
        }
        if args.output != PathBuf::from("capture.pcap") {
            config.output = args.output.clone();
        }
        if args.max_packets > 0 {
            config.max_packets = args.max_packets;
        }
        if args.verbose {
            config.verbose = true;
        }

        Ok(config)
    }

    /// Generate a sample configuration file
    #[allow(dead_code)]
    pub fn generate_sample() -> String {
        r#"# Packet Capture Configuration File
# All fields are optional. CLI arguments will override these values.

# Network interface to capture packets from (e.g., "eth0", "wlan0")
# interface = "eth0"

# Protocol to filter: "tcp", "udp", "icmp", or "all"
protocol = "all"

# Port number to filter (applies to TCP/UDP)
# port = 80

# Source IP address to filter
# source = "192.168.1.100"

# Destination IP address to filter
# destination = "10.0.0.1"

# Output file path for captured packets
output = "capture.pcap"

# Maximum number of packets to capture (0 for unlimited)
max_packets = 0

# Enable verbose output
verbose = false
"#
        .to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = Config::default();
        assert_eq!(config.protocol, "all");
        assert_eq!(config.output, PathBuf::from("capture.pcap"));
    }

    #[test]
    fn test_sample_config_is_valid() {
        let sample = Config::generate_sample();
        let _config: Config = toml::from_str(&sample).expect("Sample config should be valid TOML");
    }
}
