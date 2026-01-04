mod capture;
mod cli;
mod config;
mod filter;
mod output;

use anyhow::Result;
use log::{error, info};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use crate::capture::{print_interfaces, CaptureEngine};
use crate::cli::Args;
use crate::config::Config;

fn main() {
    if let Err(e) = run() {
        error!("Error: {:#}", e);
        std::process::exit(1);
    }
}

fn run() -> Result<()> {
    // Parse CLI arguments
    let args = Args::parse_args();

    // Initialize logging
    let log_level = if args.verbose { "debug" } else { "info" };
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or(log_level))
        .format_timestamp(Some(env_logger::fmt::TimestampPrecision::Millis))
        .init();

    // List interfaces if requested
    if args.list_interfaces {
        print_interfaces();
        return Ok(());
    }

    // Load configuration
    let config = Config::from_args(&args)?;

    info!("Packet Capture Tool v{}", env!("CARGO_PKG_VERSION"));
    info!("{:-<60}", "");

    // Set up Ctrl+C handler for graceful shutdown
    let running = Arc::new(AtomicBool::new(true));
    let r = running.clone();

    ctrlc::set_handler(move || {
        info!("\nReceived Ctrl+C, stopping capture...");
        r.store(false, Ordering::SeqCst);
    })?;

    // Create and run capture engine
    let mut engine = CaptureEngine::new(&config, running)?;
    engine.run()?;

    Ok(())
}
