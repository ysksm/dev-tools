use crate::models::*;
use std::collections::HashSet;

pub struct MermaidGenerator {
    indent: String,
}

impl MermaidGenerator {
    pub fn new() -> Self {
        Self {
            indent: "    ".to_string(),
        }
    }

    /// Generate a class diagram showing structs, enums, traits and relationships
    pub fn generate_class_diagram(&self, analysis: &CrateAnalysis) -> String {
        let mut output = String::new();
        output.push_str("classDiagram\n");

        // Generate structs
        for (full_name, struct_def) in &analysis.structs {
            output.push_str(&self.generate_struct_class(full_name, struct_def));
        }

        // Generate enums
        for (full_name, enum_def) in &analysis.enums {
            output.push_str(&self.generate_enum_class(full_name, enum_def));
        }

        // Generate traits
        for (full_name, trait_def) in &analysis.traits {
            output.push_str(&self.generate_trait_class(full_name, trait_def));
        }

        // Add methods from impl blocks
        for impl_block in &analysis.impls {
            if impl_block.trait_name.is_none() {
                output.push_str(&self.generate_impl_methods(impl_block, analysis));
            }
        }

        // Generate relationships
        output.push_str(&self.generate_class_relationships(analysis));

        output
    }

    /// Generate a module dependency diagram
    pub fn generate_module_diagram(&self, analysis: &CrateAnalysis) -> String {
        let mut output = String::new();
        output.push_str("flowchart TD\n");

        // Collect unique modules
        let mut modules: HashSet<String> = HashSet::new();
        for module_path in analysis.modules.keys() {
            modules.insert(module_path.clone());
        }

        // Also add modules from structs/enums/traits
        for full_name in analysis.structs.keys() {
            if let Some(pos) = full_name.rfind("::") {
                modules.insert(full_name[..pos].to_string());
            }
        }
        for full_name in analysis.enums.keys() {
            if let Some(pos) = full_name.rfind("::") {
                modules.insert(full_name[..pos].to_string());
            }
        }
        for full_name in analysis.traits.keys() {
            if let Some(pos) = full_name.rfind("::") {
                modules.insert(full_name[..pos].to_string());
            }
        }

        // Generate module nodes
        for module in &modules {
            let safe_id = self.sanitize_id(module);
            let short_name = module.split("::").last().unwrap_or(module);
            output.push_str(&format!("{}{}[\"{}\"]\n", self.indent, safe_id, short_name));
        }

        // Generate module dependencies
        let mut seen_deps: HashSet<(String, String)> = HashSet::new();
        for rel in &analysis.relationships {
            if rel.relation_type == RelationType::DependsOn {
                let from_id = self.sanitize_id(&rel.from);
                let to_id = self.sanitize_id(&rel.to);

                // Only if both modules exist and not already added
                if modules.contains(&rel.from)
                    && modules.contains(&rel.to)
                    && !seen_deps.contains(&(from_id.clone(), to_id.clone()))
                {
                    output.push_str(&format!("{}{} --> {}\n", self.indent, from_id, to_id));
                    seen_deps.insert((from_id, to_id));
                }
            }
        }

        // Add submodule relationships
        for (module_path, module_def) in &analysis.modules {
            for submodule in &module_def.submodules {
                let sub_path = format!("{}::{}", module_path, submodule);
                if modules.contains(&sub_path) {
                    let from_id = self.sanitize_id(module_path);
                    let to_id = self.sanitize_id(&sub_path);
                    output.push_str(&format!("{}{} -.-> {}\n", self.indent, from_id, to_id));
                }
            }
        }

        output
    }

    /// Generate a function call graph
    pub fn generate_call_graph(&self, analysis: &CrateAnalysis) -> String {
        let mut output = String::new();
        output.push_str("flowchart LR\n");

        // Generate function nodes
        for (full_name, func_def) in &analysis.functions {
            let safe_id = self.sanitize_id(full_name);
            let label = format!("{}()", func_def.name);
            output.push_str(&format!("{}{}[\"{}\"]\n", self.indent, safe_id, label));
        }

        // Generate call relationships
        let mut seen_calls: HashSet<(String, String)> = HashSet::new();
        for rel in &analysis.relationships {
            if rel.relation_type == RelationType::Calls {
                let from_id = self.sanitize_id(&rel.from);
                let to_id = self.sanitize_id(&rel.to);

                if !seen_calls.contains(&(from_id.clone(), to_id.clone())) {
                    output.push_str(&format!("{}{} --> {}\n", self.indent, from_id, to_id));
                    seen_calls.insert((from_id, to_id));
                }
            }
        }

        output
    }

    /// Generate a C4 Component diagram
    pub fn generate_c4_component(&self, analysis: &CrateAnalysis) -> String {
        let mut output = String::new();
        output.push_str("C4Component\n");
        output.push_str(&format!("title Component Diagram for {}\n\n", analysis.name));

        // Group by module (as containers)
        let mut module_components: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();

        // Add structs as components
        for (full_name, struct_def) in &analysis.structs {
            let module = self.get_parent_module(full_name);
            let component_id = self.sanitize_id(full_name);
            let description = format!("Struct with {} fields", struct_def.fields.len());
            let component = format!(
                "Component({}, \"{}\", \"Struct\", \"{}\")\n",
                component_id, struct_def.name, description
            );
            module_components.entry(module).or_default().push(component);
        }

        // Add traits as components
        for (full_name, trait_def) in &analysis.traits {
            let module = self.get_parent_module(full_name);
            let component_id = self.sanitize_id(full_name);
            let description = format!("Trait with {} methods", trait_def.methods.len());
            let component = format!(
                "Component({}, \"{}\", \"Trait\", \"{}\")\n",
                component_id, trait_def.name, description
            );
            module_components.entry(module).or_default().push(component);
        }

        // Add enums as components
        for (full_name, enum_def) in &analysis.enums {
            let module = self.get_parent_module(full_name);
            let component_id = self.sanitize_id(full_name);
            let description = format!("Enum with {} variants", enum_def.variants.len());
            let component = format!(
                "Component({}, \"{}\", \"Enum\", \"{}\")\n",
                component_id, enum_def.name, description
            );
            module_components.entry(module).or_default().push(component);
        }

        // Output containers with their components
        for (module, components) in &module_components {
            let container_id = self.sanitize_id(module);
            let short_name = module.split("::").last().unwrap_or(module);
            output.push_str(&format!(
                "Container_Boundary({}, \"{}\") {{\n",
                container_id, short_name
            ));
            for component in components {
                output.push_str(&format!("  {}", component));
            }
            output.push_str("}\n\n");
        }

        // Add relationships
        let mut seen: HashSet<String> = HashSet::new();
        for rel in &analysis.relationships {
            let from_id = self.sanitize_id(&rel.from);
            let to_id = self.sanitize_id(&rel.to);
            let key = format!("{}-{}", from_id, to_id);

            if seen.contains(&key) || from_id == to_id {
                continue;
            }
            seen.insert(key);

            let label = match rel.relation_type {
                RelationType::Implements => "implements",
                RelationType::Contains => "contains",
                RelationType::Extends => "extends",
                _ => continue,
            };

            output.push_str(&format!(
                "Rel({}, {}, \"{}\")\n",
                from_id, to_id, label
            ));
        }

        output
    }

    /// Generate a C4 Container diagram (higher-level view)
    pub fn generate_c4_container(&self, analysis: &CrateAnalysis) -> String {
        let mut output = String::new();
        output.push_str("C4Container\n");
        output.push_str(&format!("title Container Diagram for {}\n\n", analysis.name));

        // Collect unique modules
        let mut modules: HashSet<String> = HashSet::new();
        for full_name in analysis.structs.keys() {
            modules.insert(self.get_parent_module(full_name));
        }
        for full_name in analysis.enums.keys() {
            modules.insert(self.get_parent_module(full_name));
        }
        for full_name in analysis.traits.keys() {
            modules.insert(self.get_parent_module(full_name));
        }

        // Count items per module
        let mut module_stats: std::collections::HashMap<String, (usize, usize, usize)> = std::collections::HashMap::new();
        for full_name in analysis.structs.keys() {
            let module = self.get_parent_module(full_name);
            let entry = module_stats.entry(module).or_insert((0, 0, 0));
            entry.0 += 1;
        }
        for full_name in analysis.enums.keys() {
            let module = self.get_parent_module(full_name);
            let entry = module_stats.entry(module).or_insert((0, 0, 0));
            entry.1 += 1;
        }
        for full_name in analysis.traits.keys() {
            let module = self.get_parent_module(full_name);
            let entry = module_stats.entry(module).or_insert((0, 0, 0));
            entry.2 += 1;
        }

        // Generate containers for each module
        for module in &modules {
            if module.is_empty() {
                continue;
            }
            let container_id = self.sanitize_id(module);
            let short_name = module.split("::").last().unwrap_or(module);
            let stats = module_stats.get(module).unwrap_or(&(0, 0, 0));
            let description = format!("{} structs, {} enums, {} traits", stats.0, stats.1, stats.2);

            // Determine technology based on module name
            let tech = if short_name.contains("service") {
                "Service Layer"
            } else if short_name.contains("repository") || short_name.contains("repo") {
                "Repository Layer"
            } else if short_name.contains("domain") || short_name.contains("entity") || short_name.contains("model") {
                "Domain Layer"
            } else if short_name.contains("api") || short_name.contains("handler") {
                "API Layer"
            } else {
                "Rust Module"
            };

            output.push_str(&format!(
                "Container({}, \"{}\", \"{}\", \"{}\")\n",
                container_id, short_name, tech, description
            ));
        }

        output.push('\n');

        // Add module dependencies
        let mut seen: HashSet<(String, String)> = HashSet::new();
        for rel in &analysis.relationships {
            if rel.relation_type != RelationType::DependsOn {
                continue;
            }

            let from_module = &rel.from;
            let to_module = &rel.to;

            if !modules.contains(from_module) || !modules.contains(to_module) {
                continue;
            }

            let from_id = self.sanitize_id(from_module);
            let to_id = self.sanitize_id(to_module);

            if seen.contains(&(from_id.clone(), to_id.clone())) || from_id == to_id {
                continue;
            }
            seen.insert((from_id.clone(), to_id.clone()));

            output.push_str(&format!(
                "Rel({}, {}, \"uses\")\n",
                from_id, to_id
            ));
        }

        // Infer dependencies from type references
        for rel in &analysis.relationships {
            if rel.relation_type != RelationType::Contains && rel.relation_type != RelationType::Implements {
                continue;
            }

            let from_module = self.get_parent_module(&rel.from);
            let to_module = self.get_parent_module(&rel.to);

            if from_module.is_empty() || to_module.is_empty() || from_module == to_module {
                continue;
            }

            if !modules.contains(&from_module) || !modules.contains(&to_module) {
                continue;
            }

            let from_id = self.sanitize_id(&from_module);
            let to_id = self.sanitize_id(&to_module);

            if seen.contains(&(from_id.clone(), to_id.clone())) {
                continue;
            }
            seen.insert((from_id.clone(), to_id.clone()));

            output.push_str(&format!(
                "Rel({}, {}, \"uses\")\n",
                from_id, to_id
            ));
        }

        output
    }

    fn get_parent_module(&self, full_name: &str) -> String {
        if let Some(pos) = full_name.rfind("::") {
            full_name[..pos].to_string()
        } else {
            String::new()
        }
    }

    /// Generate a full diagram combining all views
    pub fn generate_full_diagram(&self, analysis: &CrateAnalysis) -> String {
        let mut output = String::new();

        output.push_str("# Rust Architecture Diagram\n\n");

        output.push_str("## C4 Container Diagram\n\n");
        output.push_str("```mermaid\n");
        output.push_str(&self.generate_c4_container(analysis));
        output.push_str("```\n\n");

        output.push_str("## C4 Component Diagram\n\n");
        output.push_str("```mermaid\n");
        output.push_str(&self.generate_c4_component(analysis));
        output.push_str("```\n\n");

        output.push_str("## Class Diagram\n\n");
        output.push_str("```mermaid\n");
        output.push_str(&self.generate_class_diagram(analysis));
        output.push_str("```\n\n");

        if !analysis.modules.is_empty() {
            output.push_str("## Module Dependencies\n\n");
            output.push_str("```mermaid\n");
            output.push_str(&self.generate_module_diagram(analysis));
            output.push_str("```\n\n");
        }

        if !analysis.functions.is_empty() {
            output.push_str("## Function Call Graph\n\n");
            output.push_str("```mermaid\n");
            output.push_str(&self.generate_call_graph(analysis));
            output.push_str("```\n\n");
        }

        output
    }

    fn generate_struct_class(&self, full_name: &str, struct_def: &StructDef) -> String {
        let mut output = String::new();
        let safe_id = self.sanitize_id(full_name);

        output.push_str(&format!("{}class {} {{\n", self.indent, safe_id));

        // Add stereotype
        output.push_str(&format!("{}{}<<struct>>\n", self.indent, self.indent));

        // Add fields
        for field in &struct_def.fields {
            let vis_marker = self.visibility_marker(&field.visibility);
            let field_name = field.name.clone().unwrap_or_else(|| "field".to_string());
            let ty = self.sanitize_type(&field.ty);
            output.push_str(&format!(
                "{}{}{} {}: {}\n",
                self.indent, self.indent, vis_marker, field_name, ty
            ));
        }

        output.push_str(&format!("{}}}\n", self.indent));
        output
    }

    fn generate_enum_class(&self, full_name: &str, enum_def: &EnumDef) -> String {
        let mut output = String::new();
        let safe_id = self.sanitize_id(full_name);

        output.push_str(&format!("{}class {} {{\n", self.indent, safe_id));

        // Add stereotype
        output.push_str(&format!("{}{}<<enum>>\n", self.indent, self.indent));

        // Add variants
        for variant in &enum_def.variants {
            if variant.fields.is_empty() {
                output.push_str(&format!("{}{}{}\n", self.indent, self.indent, variant.name));
            } else {
                let fields: Vec<String> = variant
                    .fields
                    .iter()
                    .map(|f| {
                        let name = f.name.clone().unwrap_or_default();
                        let ty = self.sanitize_type(&f.ty);
                        if name.is_empty() {
                            ty
                        } else {
                            format!("{}: {}", name, ty)
                        }
                    })
                    .collect();
                output.push_str(&format!(
                    "{}{}{}({})\n",
                    self.indent,
                    self.indent,
                    variant.name,
                    fields.join(", ")
                ));
            }
        }

        output.push_str(&format!("{}}}\n", self.indent));
        output
    }

    fn generate_trait_class(&self, full_name: &str, trait_def: &TraitDef) -> String {
        let mut output = String::new();
        let safe_id = self.sanitize_id(full_name);

        output.push_str(&format!("{}class {} {{\n", self.indent, safe_id));

        // Add stereotype
        output.push_str(&format!("{}{}<<trait>>\n", self.indent, self.indent));

        // Add methods
        for method in &trait_def.methods {
            output.push_str(&format!(
                "{}{}{}*\n",
                self.indent,
                self.indent,
                self.format_method(method)
            ));
        }

        output.push_str(&format!("{}}}\n", self.indent));
        output
    }

    fn generate_impl_methods(&self, impl_block: &ImplBlock, analysis: &CrateAnalysis) -> String {
        let mut output = String::new();

        // Find the full type name
        let self_type = &impl_block.self_type;
        let full_name = self.find_type_full_name(self_type, analysis);

        if full_name.is_empty() {
            return output;
        }

        let safe_id = self.sanitize_id(&full_name);

        for method in &impl_block.methods {
            let vis_marker = self.visibility_marker(&method.visibility);
            output.push_str(&format!(
                "{}{}:{}{}\n",
                self.indent,
                safe_id,
                vis_marker,
                self.format_method(method)
            ));
        }

        output
    }

    fn generate_class_relationships(&self, analysis: &CrateAnalysis) -> String {
        let mut output = String::new();
        let mut seen: HashSet<String> = HashSet::new();

        for rel in &analysis.relationships {
            match rel.relation_type {
                RelationType::Implements => {
                    let from_id = self.sanitize_id(&rel.from);
                    let to_id = self.sanitize_id(&rel.to);
                    let key = format!("{}-impl-{}", from_id, to_id);

                    if !seen.contains(&key) {
                        output.push_str(&format!("{}{} ..|> {}\n", self.indent, from_id, to_id));
                        seen.insert(key);
                    }
                }
                RelationType::Contains => {
                    let from_id = self.sanitize_id(&rel.from);
                    let to_id = self.sanitize_id(&rel.to);
                    let key = format!("{}-contains-{}", from_id, to_id);

                    if !seen.contains(&key) && from_id != to_id {
                        if let Some(ref label) = rel.label {
                            output.push_str(&format!(
                                "{}{} --> {} : {}\n",
                                self.indent, from_id, to_id, label
                            ));
                        } else {
                            output.push_str(&format!("{}{} --> {}\n", self.indent, from_id, to_id));
                        }
                        seen.insert(key);
                    }
                }
                RelationType::Extends => {
                    let from_id = self.sanitize_id(&rel.from);
                    let to_id = self.sanitize_id(&rel.to);
                    let key = format!("{}-extends-{}", from_id, to_id);

                    if !seen.contains(&key) {
                        output.push_str(&format!("{}{} --|> {}\n", self.indent, from_id, to_id));
                        seen.insert(key);
                    }
                }
                _ => {}
            }
        }

        output
    }

    fn find_type_full_name(&self, type_name: &str, analysis: &CrateAnalysis) -> String {
        // Check structs
        for full_name in analysis.structs.keys() {
            if full_name.ends_with(&format!("::{}", type_name)) || full_name == type_name {
                return full_name.clone();
            }
        }

        // Check enums
        for full_name in analysis.enums.keys() {
            if full_name.ends_with(&format!("::{}", type_name)) || full_name == type_name {
                return full_name.clone();
            }
        }

        String::new()
    }

    fn format_method(&self, method: &Method) -> String {
        let async_prefix = if method.is_async { "async " } else { "" };
        let receiver = match &method.receiver {
            Some(MethodReceiver::SelfValue) => "self",
            Some(MethodReceiver::SelfRef) => "&self",
            Some(MethodReceiver::SelfMutRef) => "&mut self",
            None => "",
        };

        let params: Vec<String> = method.params.iter().map(|p| self.sanitize_type(p)).collect();
        let params_str = if receiver.is_empty() {
            params.join(", ")
        } else if params.is_empty() {
            receiver.to_string()
        } else {
            format!("{}, {}", receiver, params.join(", "))
        };

        let return_type = method
            .return_type
            .as_ref()
            .map(|t| format!(" -> {}", self.sanitize_type(t)))
            .unwrap_or_default();

        format!("{}{}({}){}", async_prefix, method.name, params_str, return_type)
    }

    fn visibility_marker(&self, vis: &Visibility) -> &'static str {
        match vis {
            Visibility::Public => "+",
            Visibility::Crate | Visibility::Super => "~",
            Visibility::Private => "-",
        }
    }

    fn sanitize_id(&self, name: &str) -> String {
        name.replace("::", "_")
            .replace('-', "_")
            .replace(['<', '>', '(', ')', '[', ']', ',', ' ', '&', '*', '\''], "_")
            .replace("__", "_")
            .trim_matches('_')
            .to_string()
    }

    fn sanitize_type(&self, ty: &str) -> String {
        ty.replace('<', "~")
            .replace('>', "~")
            .replace(',', " ")
            .replace('"', "'")
    }
}

impl Default for MermaidGenerator {
    fn default() -> Self {
        Self::new()
    }
}
