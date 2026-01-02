use crate::models::*;
use std::collections::HashSet;

pub struct RelationshipAnalyzer;

impl RelationshipAnalyzer {
    pub fn new() -> Self {
        Self
    }

    /// Analyze all relationships in the crate
    pub fn analyze(&self, analysis: &mut CrateAnalysis) {
        let mut relationships = vec![];

        // Collect impl relationships (type implements trait)
        relationships.extend(self.analyze_impl_relationships(analysis));

        // Collect field containment relationships
        relationships.extend(self.analyze_field_relationships(analysis));

        // Collect function call relationships
        relationships.extend(self.analyze_call_relationships(analysis));

        // Collect module dependency relationships
        relationships.extend(self.analyze_module_dependencies(analysis));

        // Collect trait inheritance relationships
        relationships.extend(self.analyze_trait_inheritance(analysis));

        analysis.relationships = relationships;
    }

    /// Analyze impl blocks to find trait implementations
    fn analyze_impl_relationships(&self, analysis: &CrateAnalysis) -> Vec<Relationship> {
        let mut relationships = vec![];
        let type_names = analysis.all_type_names();

        for impl_block in &analysis.impls {
            // Find the full type name
            let self_type = self.resolve_type_name(&impl_block.self_type, &type_names);

            if let Some(ref trait_name) = impl_block.trait_name {
                // Find full trait name
                let trait_full = self.find_trait_name(trait_name, analysis);

                relationships.push(Relationship {
                    from: self_type.clone(),
                    to: trait_full,
                    relation_type: RelationType::Implements,
                    label: None,
                });
            }
        }

        relationships
    }

    /// Analyze struct/enum fields to find containment relationships
    fn analyze_field_relationships(&self, analysis: &CrateAnalysis) -> Vec<Relationship> {
        let mut relationships = vec![];
        let type_names = analysis.all_type_names();

        // Analyze struct fields
        for (full_name, struct_def) in &analysis.structs {
            for field in &struct_def.fields {
                let referenced_types = self.extract_type_references(&field.ty, &type_names);
                for ref_type in referenced_types {
                    relationships.push(Relationship {
                        from: full_name.clone(),
                        to: ref_type,
                        relation_type: RelationType::Contains,
                        label: field.name.clone(),
                    });
                }
            }
        }

        // Analyze enum variant fields
        for (full_name, enum_def) in &analysis.enums {
            for variant in &enum_def.variants {
                for field in &variant.fields {
                    let referenced_types = self.extract_type_references(&field.ty, &type_names);
                    for ref_type in referenced_types {
                        relationships.push(Relationship {
                            from: full_name.clone(),
                            to: ref_type,
                            relation_type: RelationType::Contains,
                            label: Some(format!("{}::{}", variant.name, field.name.clone().unwrap_or_default())),
                        });
                    }
                }
            }
        }

        relationships
    }

    /// Analyze function calls
    fn analyze_call_relationships(&self, analysis: &CrateAnalysis) -> Vec<Relationship> {
        let mut relationships = vec![];
        let function_names: HashSet<String> = analysis.functions.keys().cloned().collect();

        for (full_name, func_def) in &analysis.functions {
            for call in &func_def.calls {
                // Try to find the full function name
                let called_func = self.resolve_function_name(call, &function_names, &func_def.module_path);

                if !called_func.is_empty() {
                    relationships.push(Relationship {
                        from: full_name.clone(),
                        to: called_func,
                        relation_type: RelationType::Calls,
                        label: None,
                    });
                }
            }
        }

        // Note: Method calls within impl blocks would require additional AST traversal
        // This is a simplified version that focuses on top-level function calls

        relationships
    }

    /// Analyze module dependencies via use statements
    fn analyze_module_dependencies(&self, analysis: &CrateAnalysis) -> Vec<Relationship> {
        let mut relationships = vec![];

        for (module_path, module_def) in &analysis.modules {
            for use_def in &module_def.uses {
                // Extract the module part of the use path
                let parts: Vec<&str> = use_def.path.split("::").collect();
                if parts.len() >= 2 {
                    let dep_module = parts[..parts.len() - 1].join("::");
                    if !dep_module.is_empty() && dep_module != *module_path {
                        relationships.push(Relationship {
                            from: module_path.clone(),
                            to: dep_module,
                            relation_type: RelationType::DependsOn,
                            label: None,
                        });
                    }
                }
            }

            // Submodule relationships
            for submodule in &module_def.submodules {
                let sub_path = format!("{}::{}", module_path, submodule);
                relationships.push(Relationship {
                    from: module_path.clone(),
                    to: sub_path,
                    relation_type: RelationType::Contains,
                    label: None,
                });
            }
        }

        relationships
    }

    /// Analyze trait inheritance
    fn analyze_trait_inheritance(&self, analysis: &CrateAnalysis) -> Vec<Relationship> {
        let mut relationships = vec![];

        for (full_name, trait_def) in &analysis.traits {
            for super_trait in &trait_def.super_traits {
                let super_full = self.find_trait_name(super_trait, analysis);
                relationships.push(Relationship {
                    from: full_name.clone(),
                    to: super_full,
                    relation_type: RelationType::Extends,
                    label: None,
                });
            }
        }

        relationships
    }

    /// Extract type references from a type string
    fn extract_type_references(&self, type_str: &str, known_types: &HashSet<String>) -> Vec<String> {
        let mut references = vec![];

        // Clean up the type string
        let cleaned = type_str
            .replace(['<', '>', '(', ')', '[', ']', ',', '&', '*'], " ")
            .replace("mut", " ")
            .replace("dyn", " ");

        // Extract potential type names
        for part in cleaned.split_whitespace() {
            let type_name = part.trim();
            if type_name.is_empty() {
                continue;
            }

            // Skip common primitive/std types
            if is_primitive_type(type_name) {
                continue;
            }

            // Try to find matching known type
            let resolved = self.resolve_type_name(type_name, known_types);
            if !resolved.is_empty() && resolved != type_name {
                references.push(resolved);
            } else if known_types.iter().any(|t| t.ends_with(&format!("::{}", type_name))) {
                // Find matching type
                for known in known_types {
                    if known.ends_with(&format!("::{}", type_name)) {
                        references.push(known.clone());
                        break;
                    }
                }
            }
        }

        references
    }

    /// Resolve a simple type name to its full path
    fn resolve_type_name(&self, type_name: &str, known_types: &HashSet<String>) -> String {
        // If already fully qualified
        if known_types.contains(type_name) {
            return type_name.to_string();
        }

        // Try to find by simple name
        let simple_name = type_name.split("::").last().unwrap_or(type_name);
        for known in known_types {
            if known.ends_with(&format!("::{}", simple_name)) || known == simple_name {
                return known.clone();
            }
        }

        type_name.to_string()
    }

    /// Find full trait name
    fn find_trait_name(&self, trait_name: &str, analysis: &CrateAnalysis) -> String {
        // If already fully qualified
        if analysis.traits.contains_key(trait_name) {
            return trait_name.to_string();
        }

        // Try to find by simple name
        let simple_name = trait_name.split("::").last().unwrap_or(trait_name);
        for known in analysis.traits.keys() {
            if known.ends_with(&format!("::{}", simple_name)) {
                return known.clone();
            }
        }

        // Return as-is (might be external trait)
        trait_name.to_string()
    }

    /// Resolve a function call name
    fn resolve_function_name(&self, call_name: &str, known_functions: &HashSet<String>, current_module: &str) -> String {
        // If already known
        if known_functions.contains(call_name) {
            return call_name.to_string();
        }

        // Try with current module prefix
        let full_name = format!("{}::{}", current_module, call_name);
        if known_functions.contains(&full_name) {
            return full_name;
        }

        // Try to find by simple name
        for known in known_functions {
            if known.ends_with(&format!("::{}", call_name)) {
                return known.clone();
            }
        }

        String::new()
    }
}

impl Default for RelationshipAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

fn is_primitive_type(name: &str) -> bool {
    matches!(
        name,
        "bool"
            | "char"
            | "str"
            | "u8"
            | "u16"
            | "u32"
            | "u64"
            | "u128"
            | "usize"
            | "i8"
            | "i16"
            | "i32"
            | "i64"
            | "i128"
            | "isize"
            | "f32"
            | "f64"
            | "String"
            | "Vec"
            | "Option"
            | "Result"
            | "Box"
            | "Rc"
            | "Arc"
            | "RefCell"
            | "Cell"
            | "Mutex"
            | "RwLock"
            | "HashMap"
            | "HashSet"
            | "BTreeMap"
            | "BTreeSet"
            | "VecDeque"
            | "LinkedList"
            | "BinaryHeap"
            | "Cow"
            | "Pin"
            | "PhantomData"
            | "Self"
    )
}
