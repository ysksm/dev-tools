use anyhow::{Context, Result};
use std::fs::File;
use std::io::{BufWriter, Write};
use std::path::Path;

/// PCAP file magic number (microsecond resolution)
const PCAP_MAGIC: u32 = 0xa1b2c3d4;
/// PCAP version major
const PCAP_VERSION_MAJOR: u16 = 2;
/// PCAP version minor
const PCAP_VERSION_MINOR: u16 = 4;
/// Ethernet link type
const LINKTYPE_ETHERNET: u32 = 1;
/// Maximum snapshot length
const SNAPLEN: u32 = 65535;

/// PCAP file writer for saving captured packets
pub struct PcapWriter {
    writer: BufWriter<File>,
    packet_count: usize,
}

impl PcapWriter {
    /// Create a new PCAP writer
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self> {
        let file = File::create(path.as_ref())
            .with_context(|| format!("Failed to create output file: {:?}", path.as_ref()))?;
        let mut writer = BufWriter::new(file);

        // Write PCAP global header
        Self::write_global_header(&mut writer)?;

        Ok(PcapWriter {
            writer,
            packet_count: 0,
        })
    }

    /// Write the PCAP global header
    fn write_global_header(writer: &mut BufWriter<File>) -> Result<()> {
        // Magic number
        writer.write_all(&PCAP_MAGIC.to_le_bytes())?;
        // Version major
        writer.write_all(&PCAP_VERSION_MAJOR.to_le_bytes())?;
        // Version minor
        writer.write_all(&PCAP_VERSION_MINOR.to_le_bytes())?;
        // Timezone offset (GMT)
        writer.write_all(&0i32.to_le_bytes())?;
        // Timestamp accuracy
        writer.write_all(&0u32.to_le_bytes())?;
        // Snapshot length
        writer.write_all(&SNAPLEN.to_le_bytes())?;
        // Link-layer header type
        writer.write_all(&LINKTYPE_ETHERNET.to_le_bytes())?;

        writer.flush()?;
        Ok(())
    }

    /// Write a packet to the PCAP file
    pub fn write_packet(&mut self, timestamp_secs: u32, timestamp_usecs: u32, data: &[u8]) -> Result<()> {
        let captured_len = data.len() as u32;
        let original_len = captured_len;

        // Write packet header
        // Timestamp seconds
        self.writer.write_all(&timestamp_secs.to_le_bytes())?;
        // Timestamp microseconds
        self.writer.write_all(&timestamp_usecs.to_le_bytes())?;
        // Captured length
        self.writer.write_all(&captured_len.to_le_bytes())?;
        // Original length
        self.writer.write_all(&original_len.to_le_bytes())?;

        // Write packet data
        self.writer.write_all(data)?;

        self.packet_count += 1;
        Ok(())
    }

    /// Flush the writer
    pub fn flush(&mut self) -> Result<()> {
        self.writer.flush()?;
        Ok(())
    }

    /// Get the number of packets written
    pub fn packet_count(&self) -> usize {
        self.packet_count
    }
}

impl Drop for PcapWriter {
    fn drop(&mut self) {
        let _ = self.flush();
    }
}

/// Captured packet information for display and logging
#[derive(Debug, Clone)]
pub struct CapturedPacket {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub protocol: String,
    pub src_ip: String,
    pub dst_ip: String,
    pub src_port: Option<u16>,
    pub dst_port: Option<u16>,
    pub length: usize,
}

impl std::fmt::Display for CapturedPacket {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let src = if let Some(port) = self.src_port {
            format!("{}:{}", self.src_ip, port)
        } else {
            self.src_ip.clone()
        };

        let dst = if let Some(port) = self.dst_port {
            format!("{}:{}", self.dst_ip, port)
        } else {
            self.dst_ip.clone()
        };

        write!(
            f,
            "[{}] {} {} -> {} ({} bytes)",
            self.timestamp.format("%H:%M:%S%.3f"),
            self.protocol,
            src,
            dst,
            self.length
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_pcap_writer_creation() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("test.pcap");

        let writer = PcapWriter::new(&path);
        assert!(writer.is_ok());

        // Check that file was created with header
        let metadata = fs::metadata(&path).unwrap();
        assert_eq!(metadata.len(), 24); // Global header is 24 bytes
    }
}
