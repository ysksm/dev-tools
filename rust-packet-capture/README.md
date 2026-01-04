# Packet Capture CLI Tool

A command-line packet capture tool written in Rust with filtering capabilities.

## Features

- Capture packets from any network interface
- Filter by protocol (TCP, UDP, ICMP)
- Filter by port number
- Filter by source/destination IP address
- Save captured packets to PCAP format (compatible with Wireshark)
- Configuration via command-line arguments or TOML config file
- Graceful shutdown with Ctrl+C

## Requirements

- Linux/macOS (Windows support may require additional setup)
- Root/Administrator privileges for packet capture
- Rust 1.70 or later

## Installation

```bash
# Clone and build
cd rust-packet-capture
cargo build --release

# The binary will be at target/release/packet-capture
```

## Usage

### Basic Usage

```bash
# List available network interfaces
sudo ./packet-capture -l

# Capture all packets on default interface
sudo ./packet-capture

# Capture on specific interface
sudo ./packet-capture -i eth0

# Capture with verbose output
sudo ./packet-capture -i eth0 -v
```

### Filtering Options

```bash
# Capture only TCP packets
sudo ./packet-capture -p tcp

# Capture only packets on port 80
sudo ./packet-capture -P 80

# Capture packets from specific source IP
sudo ./packet-capture -s 192.168.1.100

# Capture packets to specific destination IP
sudo ./packet-capture -d 10.0.0.1

# Combine filters
sudo ./packet-capture -p tcp -P 443 -s 192.168.1.100

# Limit number of captured packets
sudo ./packet-capture -n 1000
```

### Using Configuration File

```bash
# Use a configuration file
sudo ./packet-capture -c config.toml

# CLI arguments override config file values
sudo ./packet-capture -c config.toml -p tcp
```

### Output Options

```bash
# Specify output file
sudo ./packet-capture -o my_capture.pcap
```

## Command-Line Options

| Option | Long | Description |
|--------|------|-------------|
| `-i` | `--interface` | Network interface to capture from |
| `-p` | `--protocol` | Protocol filter (tcp, udp, icmp, all) |
| `-P` | `--port` | Port number to filter |
| `-s` | `--source` | Source IP address to filter |
| `-d` | `--destination` | Destination IP address to filter |
| `-o` | `--output` | Output file path (default: capture.pcap) |
| `-c` | `--config` | Path to configuration file |
| `-n` | `--max-packets` | Maximum packets to capture (0 = unlimited) |
| `-l` | `--list-interfaces` | List available interfaces and exit |
| `-v` | `--verbose` | Enable verbose output |
| `-h` | `--help` | Show help message |
| `-V` | `--version` | Show version |

## Configuration File Format

Create a `config.toml` file:

```toml
# Network interface
interface = "eth0"

# Protocol filter: "tcp", "udp", "icmp", or "all"
protocol = "tcp"

# Port filter
port = 80

# Source IP filter
source = "192.168.1.100"

# Destination IP filter
destination = "10.0.0.1"

# Output file path
output = "capture.pcap"

# Maximum packets (0 for unlimited)
max_packets = 1000

# Verbose output
verbose = true
```

See `config.example.toml` for a complete example.

## Output Format

Captured packets are saved in PCAP format, which can be opened with:
- [Wireshark](https://www.wireshark.org/)
- [tcpdump](https://www.tcpdump.org/)
- Other network analysis tools

## Examples

### Capture HTTP Traffic

```bash
sudo ./packet-capture -p tcp -P 80 -o http_traffic.pcap -v
```

### Capture DNS Queries

```bash
sudo ./packet-capture -p udp -P 53 -o dns_queries.pcap -v
```

### Capture HTTPS Traffic from Specific Host

```bash
sudo ./packet-capture -p tcp -P 443 -s 192.168.1.50 -o https_traffic.pcap
```

### Monitor All Traffic for 100 Packets

```bash
sudo ./packet-capture -n 100 -v -o sample.pcap
```

## Troubleshooting

### Permission Denied

Packet capture requires root privileges:

```bash
sudo ./packet-capture ...
```

### No Suitable Interface Found

List available interfaces and specify one explicitly:

```bash
sudo ./packet-capture -l
sudo ./packet-capture -i <interface_name>
```

### libpcap Not Found

Install libpcap development libraries:

```bash
# Debian/Ubuntu
sudo apt-get install libpcap-dev

# Fedora/RHEL
sudo dnf install libpcap-devel

# macOS
brew install libpcap
```

## License

MIT License
