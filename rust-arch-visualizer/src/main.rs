use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use rust_arch_visualizer::{
    DiagramType, MermaidGenerator, RelationshipAnalyzer, RustParser,
};
use std::fs;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "rust-arch")]
#[command(author, version, about = "Visualize Rust architecture as Mermaid diagrams")]
#[command(long_about = "A CLI tool to analyze Rust codebases and generate Mermaid diagrams \
    showing traits, structs, modules, and their relationships.")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Analyze a Rust crate and generate diagrams
    Analyze {
        /// Path to the Rust crate directory
        #[arg(default_value = ".")]
        path: PathBuf,

        /// Output file path (defaults to stdout)
        #[arg(short, long)]
        output: Option<PathBuf>,

        /// Type of diagram to generate
        #[arg(short, long, value_enum, default_value = "full")]
        diagram: DiagramType,

        /// Output as raw mermaid (without markdown wrapper)
        #[arg(long)]
        raw: bool,

        /// Output analysis as JSON instead of Mermaid
        #[arg(long)]
        json: bool,
    },

    /// Analyze a single Rust source file
    File {
        /// Path to the Rust source file
        path: PathBuf,

        /// Output file path (defaults to stdout)
        #[arg(short, long)]
        output: Option<PathBuf>,

        /// Type of diagram to generate
        #[arg(short, long, value_enum, default_value = "full")]
        diagram: DiagramType,

        /// Output as raw mermaid (without markdown wrapper)
        #[arg(long)]
        raw: bool,
    },
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Analyze {
            path,
            output,
            diagram,
            raw,
            json,
        } => {
            analyze_crate(&path, output.as_deref(), diagram, raw, json)?;
        }
        Commands::File {
            path,
            output,
            diagram,
            raw,
        } => {
            analyze_file(&path, output.as_deref(), diagram, raw)?;
        }
    }

    Ok(())
}

fn analyze_crate(
    path: &PathBuf,
    output: Option<&std::path::Path>,
    diagram: DiagramType,
    raw: bool,
    json: bool,
) -> Result<()> {
    let path = path.canonicalize().with_context(|| {
        format!("Failed to resolve path: {}", path.display())
    })?;

    eprintln!("Analyzing crate at: {}", path.display());

    let mut parser = RustParser::new();
    let mut analysis = parser.parse_crate(&path)?;

    // Analyze relationships
    let analyzer = RelationshipAnalyzer::new();
    analyzer.analyze(&mut analysis);

    eprintln!(
        "Found: {} structs, {} enums, {} traits, {} functions",
        analysis.structs.len(),
        analysis.enums.len(),
        analysis.traits.len(),
        analysis.functions.len()
    );

    let output_content = if json {
        serde_json::to_string_pretty(&analysis)?
    } else {
        generate_diagram(&analysis, diagram, raw)
    };

    write_output(&output_content, output)?;

    Ok(())
}

fn analyze_file(
    path: &PathBuf,
    output: Option<&std::path::Path>,
    diagram: DiagramType,
    raw: bool,
) -> Result<()> {
    let path = path.canonicalize().with_context(|| {
        format!("Failed to resolve path: {}", path.display())
    })?;

    eprintln!("Analyzing file: {}", path.display());

    let module_name = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("module");

    let mut parser = RustParser::new();
    let mut analysis = parser.parse_file(&path, module_name)?;

    // Analyze relationships
    let analyzer = RelationshipAnalyzer::new();
    analyzer.analyze(&mut analysis);

    eprintln!(
        "Found: {} structs, {} enums, {} traits, {} functions",
        analysis.structs.len(),
        analysis.enums.len(),
        analysis.traits.len(),
        analysis.functions.len()
    );

    let output_content = generate_diagram(&analysis, diagram, raw);

    write_output(&output_content, output)?;

    Ok(())
}

fn generate_diagram(
    analysis: &rust_arch_visualizer::CrateAnalysis,
    diagram: DiagramType,
    raw: bool,
) -> String {
    let generator = MermaidGenerator::new();

    match diagram {
        DiagramType::Class => {
            let content = generator.generate_class_diagram(analysis);
            if raw {
                content
            } else {
                format!("```mermaid\n{}```\n", content)
            }
        }
        DiagramType::Module => {
            let content = generator.generate_module_diagram(analysis);
            if raw {
                content
            } else {
                format!("```mermaid\n{}```\n", content)
            }
        }
        DiagramType::CallGraph => {
            let content = generator.generate_call_graph(analysis);
            if raw {
                content
            } else {
                format!("```mermaid\n{}```\n", content)
            }
        }
        DiagramType::Full => generator.generate_full_diagram(analysis),
    }
}

fn write_output(content: &str, output: Option<&std::path::Path>) -> Result<()> {
    if let Some(output_path) = output {
        fs::write(output_path, content).with_context(|| {
            format!("Failed to write output to: {}", output_path.display())
        })?;
        eprintln!("Output written to: {}", output_path.display());
    } else {
        println!("{}", content);
    }

    Ok(())
}
