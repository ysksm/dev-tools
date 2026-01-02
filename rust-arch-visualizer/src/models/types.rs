use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

/// Visibility of an item
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Visibility {
    Public,
    Crate,
    Super,
    Private,
}

impl Default for Visibility {
    fn default() -> Self {
        Visibility::Private
    }
}

/// A field in a struct
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StructField {
    pub name: Option<String>, // None for tuple structs
    pub ty: String,
    pub visibility: Visibility,
}

/// A variant in an enum
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnumVariant {
    pub name: String,
    pub fields: Vec<StructField>,
    pub discriminant: Option<String>,
}

/// A method signature
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Method {
    pub name: String,
    pub visibility: Visibility,
    pub is_async: bool,
    pub receiver: Option<MethodReceiver>,
    pub params: Vec<String>,
    pub return_type: Option<String>,
}

/// Method receiver type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MethodReceiver {
    SelfValue,
    SelfRef,
    SelfMutRef,
}

/// A struct definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StructDef {
    pub name: String,
    pub visibility: Visibility,
    pub fields: Vec<StructField>,
    pub generics: Vec<String>,
    pub is_tuple: bool,
    pub module_path: String,
}

/// An enum definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnumDef {
    pub name: String,
    pub visibility: Visibility,
    pub variants: Vec<EnumVariant>,
    pub generics: Vec<String>,
    pub module_path: String,
}

/// A trait definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraitDef {
    pub name: String,
    pub visibility: Visibility,
    pub methods: Vec<Method>,
    pub generics: Vec<String>,
    pub super_traits: Vec<String>,
    pub module_path: String,
}

/// An impl block
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImplBlock {
    pub self_type: String,
    pub trait_name: Option<String>,
    pub methods: Vec<Method>,
    pub generics: Vec<String>,
    pub module_path: String,
}

/// A function definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionDef {
    pub name: String,
    pub visibility: Visibility,
    pub is_async: bool,
    pub params: Vec<String>,
    pub return_type: Option<String>,
    pub calls: Vec<String>, // Functions called within this function
    pub module_path: String,
}

/// A module definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleDef {
    pub name: String,
    pub visibility: Visibility,
    pub path: String,
    pub submodules: Vec<String>,
    pub uses: Vec<UseDef>,
}

/// A use statement
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UseDef {
    pub path: String,
    pub alias: Option<String>,
    pub visibility: Visibility,
}

/// Relationship types between items
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum RelationType {
    /// Struct/Enum implements Trait
    Implements,
    /// Field contains another type
    Contains,
    /// Function/Method calls another
    Calls,
    /// Module depends on another (via use)
    DependsOn,
    /// Trait extends another trait
    Extends,
    /// Type references another type
    References,
}

/// A relationship between two items
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Relationship {
    pub from: String,
    pub to: String,
    pub relation_type: RelationType,
    pub label: Option<String>,
}

/// The complete crate analysis result
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CrateAnalysis {
    pub name: String,
    pub structs: HashMap<String, StructDef>,
    pub enums: HashMap<String, EnumDef>,
    pub traits: HashMap<String, TraitDef>,
    pub impls: Vec<ImplBlock>,
    pub functions: HashMap<String, FunctionDef>,
    pub modules: HashMap<String, ModuleDef>,
    pub relationships: Vec<Relationship>,
}

impl CrateAnalysis {
    pub fn new(name: String) -> Self {
        Self {
            name,
            ..Default::default()
        }
    }

    pub fn merge(&mut self, other: CrateAnalysis) {
        self.structs.extend(other.structs);
        self.enums.extend(other.enums);
        self.traits.extend(other.traits);
        self.impls.extend(other.impls);
        self.functions.extend(other.functions);
        self.modules.extend(other.modules);
        self.relationships.extend(other.relationships);
    }

    /// Get all type names (structs and enums)
    pub fn all_type_names(&self) -> HashSet<String> {
        let mut names: HashSet<String> = self.structs.keys().cloned().collect();
        names.extend(self.enums.keys().cloned());
        names
    }
}

/// Output format for the generated diagram
#[derive(Debug, Clone, Copy, PartialEq, Eq, clap::ValueEnum)]
pub enum DiagramType {
    /// Class diagram showing structs, enums, traits and their relationships
    Class,
    /// Module dependency graph
    Module,
    /// Function call graph
    CallGraph,
    /// C4 Component diagram
    C4Component,
    /// C4 Container diagram (higher level view)
    C4Container,
    /// All diagrams combined
    Full,
}

impl Default for DiagramType {
    fn default() -> Self {
        DiagramType::Full
    }
}
