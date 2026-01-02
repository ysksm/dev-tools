use crate::models::*;
use anyhow::{Context, Result};
use std::fs;
use std::path::Path;
use syn::{
    visit::Visit, Expr, Fields, FnArg, GenericParam, Generics, ImplItem, Item, ItemEnum, ItemFn,
    ItemImpl, ItemMod, ItemStruct, ItemTrait, ItemUse, Pat, ReturnType, TraitItem, Type,
    UseTree, Visibility as SynVisibility,
};
use walkdir::WalkDir;

pub struct RustParser {
    current_module: String,
}

impl RustParser {
    pub fn new() -> Self {
        Self {
            current_module: String::new(),
        }
    }

    /// Parse a single Rust source file
    pub fn parse_file(&mut self, path: &Path, module_path: &str) -> Result<CrateAnalysis> {
        let content = fs::read_to_string(path)
            .with_context(|| format!("Failed to read file: {}", path.display()))?;

        self.current_module = module_path.to_string();
        self.parse_source(&content, module_path)
    }

    /// Parse Rust source code string
    pub fn parse_source(&mut self, source: &str, module_path: &str) -> Result<CrateAnalysis> {
        let syntax = syn::parse_file(source)
            .with_context(|| "Failed to parse Rust source code")?;

        self.current_module = module_path.to_string();
        let mut analysis = CrateAnalysis::new(module_path.to_string());

        for item in &syntax.items {
            self.process_item(item, &mut analysis, module_path);
        }

        Ok(analysis)
    }

    /// Parse an entire crate/project directory
    pub fn parse_crate(&mut self, path: &Path) -> Result<CrateAnalysis> {
        let crate_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let mut analysis = CrateAnalysis::new(crate_name.clone());

        // Find src directory
        let src_path = if path.join("src").exists() {
            path.join("src")
        } else {
            path.to_path_buf()
        };

        // Walk through all .rs files
        for entry in WalkDir::new(&src_path)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.path().extension().map_or(false, |ext| ext == "rs")
            })
        {
            let file_path = entry.path();
            let module_path = self.compute_module_path(&src_path, file_path, &crate_name);

            match self.parse_file(file_path, &module_path) {
                Ok(file_analysis) => {
                    analysis.merge(file_analysis);
                }
                Err(e) => {
                    eprintln!("Warning: Failed to parse {}: {}", file_path.display(), e);
                }
            }
        }

        Ok(analysis)
    }

    fn compute_module_path(&self, src_root: &Path, file_path: &Path, crate_name: &str) -> String {
        let relative = file_path.strip_prefix(src_root).unwrap_or(file_path);
        let mut parts: Vec<&str> = relative
            .components()
            .filter_map(|c| c.as_os_str().to_str())
            .collect();

        // Remove .rs extension from last part
        if let Some(last) = parts.last_mut() {
            if let Some(name) = last.strip_suffix(".rs") {
                *last = name;
            }
        }

        // Handle lib.rs and mod.rs specially
        if parts.last() == Some(&"lib") || parts.last() == Some(&"mod") {
            parts.pop();
        }
        if parts.last() == Some(&"main") {
            parts.pop();
        }

        if parts.is_empty() {
            crate_name.to_string()
        } else {
            format!("{}::{}", crate_name, parts.join("::"))
        }
    }

    fn process_item(&self, item: &Item, analysis: &mut CrateAnalysis, module_path: &str) {
        match item {
            Item::Struct(s) => self.process_struct(s, analysis, module_path),
            Item::Enum(e) => self.process_enum(e, analysis, module_path),
            Item::Trait(t) => self.process_trait(t, analysis, module_path),
            Item::Impl(i) => self.process_impl(i, analysis, module_path),
            Item::Fn(f) => self.process_function(f, analysis, module_path),
            Item::Mod(m) => self.process_module(m, analysis, module_path),
            Item::Use(u) => self.process_use(u, analysis, module_path),
            _ => {}
        }
    }

    fn process_struct(&self, s: &ItemStruct, analysis: &mut CrateAnalysis, module_path: &str) {
        let name = s.ident.to_string();
        let full_name = format!("{}::{}", module_path, name);

        let (fields, is_tuple) = match &s.fields {
            Fields::Named(named) => {
                let fields = named
                    .named
                    .iter()
                    .map(|f| StructField {
                        name: f.ident.as_ref().map(|i| i.to_string()),
                        ty: type_to_string(&f.ty),
                        visibility: convert_visibility(&f.vis),
                    })
                    .collect();
                (fields, false)
            }
            Fields::Unnamed(unnamed) => {
                let fields = unnamed
                    .unnamed
                    .iter()
                    .enumerate()
                    .map(|(i, f)| StructField {
                        name: Some(format!("{}", i)),
                        ty: type_to_string(&f.ty),
                        visibility: convert_visibility(&f.vis),
                    })
                    .collect();
                (fields, true)
            }
            Fields::Unit => (vec![], false),
        };

        let struct_def = StructDef {
            name: name.clone(),
            visibility: convert_visibility(&s.vis),
            fields,
            generics: extract_generics(&s.generics),
            is_tuple,
            module_path: module_path.to_string(),
        };

        analysis.structs.insert(full_name, struct_def);
    }

    fn process_enum(&self, e: &ItemEnum, analysis: &mut CrateAnalysis, module_path: &str) {
        let name = e.ident.to_string();
        let full_name = format!("{}::{}", module_path, name);

        let variants = e
            .variants
            .iter()
            .map(|v| {
                let fields = match &v.fields {
                    Fields::Named(named) => named
                        .named
                        .iter()
                        .map(|f| StructField {
                            name: f.ident.as_ref().map(|i| i.to_string()),
                            ty: type_to_string(&f.ty),
                            visibility: Visibility::Private,
                        })
                        .collect(),
                    Fields::Unnamed(unnamed) => unnamed
                        .unnamed
                        .iter()
                        .enumerate()
                        .map(|(i, f)| StructField {
                            name: Some(format!("{}", i)),
                            ty: type_to_string(&f.ty),
                            visibility: Visibility::Private,
                        })
                        .collect(),
                    Fields::Unit => vec![],
                };

                EnumVariant {
                    name: v.ident.to_string(),
                    fields,
                    discriminant: v.discriminant.as_ref().map(|(_, expr)| expr_to_string(expr)),
                }
            })
            .collect();

        let enum_def = EnumDef {
            name: name.clone(),
            visibility: convert_visibility(&e.vis),
            variants,
            generics: extract_generics(&e.generics),
            module_path: module_path.to_string(),
        };

        analysis.enums.insert(full_name, enum_def);
    }

    fn process_trait(&self, t: &ItemTrait, analysis: &mut CrateAnalysis, module_path: &str) {
        let name = t.ident.to_string();
        let full_name = format!("{}::{}", module_path, name);

        let methods = t
            .items
            .iter()
            .filter_map(|item| {
                if let TraitItem::Fn(m) = item {
                    Some(self.extract_method_signature(&m.sig))
                } else {
                    None
                }
            })
            .collect();

        let super_traits = t
            .supertraits
            .iter()
            .map(|bound| quote::quote!(#bound).to_string())
            .collect();

        let trait_def = TraitDef {
            name: name.clone(),
            visibility: convert_visibility(&t.vis),
            methods,
            generics: extract_generics(&t.generics),
            super_traits,
            module_path: module_path.to_string(),
        };

        analysis.traits.insert(full_name, trait_def);
    }

    fn process_impl(&self, i: &ItemImpl, analysis: &mut CrateAnalysis, module_path: &str) {
        let self_type = type_to_string(&i.self_ty);

        let trait_name = i.trait_.as_ref().map(|(_, path, _)| {
            path.segments
                .iter()
                .map(|s| s.ident.to_string())
                .collect::<Vec<_>>()
                .join("::")
        });

        let methods = i
            .items
            .iter()
            .filter_map(|item| {
                if let ImplItem::Fn(m) = item {
                    let mut method = self.extract_method_signature(&m.sig);
                    method.visibility = convert_visibility(&m.vis);
                    Some(method)
                } else {
                    None
                }
            })
            .collect();

        let impl_block = ImplBlock {
            self_type,
            trait_name,
            methods,
            generics: extract_generics(&i.generics),
            module_path: module_path.to_string(),
        };

        analysis.impls.push(impl_block);
    }

    fn process_function(&self, f: &ItemFn, analysis: &mut CrateAnalysis, module_path: &str) {
        let name = f.sig.ident.to_string();
        let full_name = format!("{}::{}", module_path, name);

        let params = f
            .sig
            .inputs
            .iter()
            .filter_map(|arg| {
                if let FnArg::Typed(pat) = arg {
                    Some(format!("{}: {}", pat_to_string(&pat.pat), type_to_string(&pat.ty)))
                } else {
                    None
                }
            })
            .collect();

        let return_type = match &f.sig.output {
            ReturnType::Default => None,
            ReturnType::Type(_, ty) => Some(type_to_string(ty)),
        };

        // Extract function calls
        let mut call_visitor = FunctionCallVisitor::new();
        call_visitor.visit_block(&f.block);

        let func_def = FunctionDef {
            name: name.clone(),
            visibility: convert_visibility(&f.vis),
            is_async: f.sig.asyncness.is_some(),
            params,
            return_type,
            calls: call_visitor.calls,
            module_path: module_path.to_string(),
        };

        analysis.functions.insert(full_name, func_def);
    }

    fn process_module(&self, m: &ItemMod, analysis: &mut CrateAnalysis, module_path: &str) {
        let name = m.ident.to_string();
        let full_path = if module_path.is_empty() {
            name.clone()
        } else {
            format!("{}::{}", module_path, name)
        };

        let mut module_def = ModuleDef {
            name: name.clone(),
            visibility: convert_visibility(&m.vis),
            path: full_path.clone(),
            submodules: vec![],
            uses: vec![],
        };

        // Process inline module content
        if let Some((_, items)) = &m.content {
            for item in items {
                self.process_item(item, analysis, &full_path);

                // Track submodules
                if let Item::Mod(sub) = item {
                    module_def.submodules.push(sub.ident.to_string());
                }

                // Track uses
                if let Item::Use(u) = item {
                    module_def.uses.extend(extract_uses(&u.tree, convert_visibility(&u.vis)));
                }
            }
        }

        analysis.modules.insert(full_path, module_def);
    }

    fn process_use(&self, u: &ItemUse, analysis: &mut CrateAnalysis, module_path: &str) {
        if let Some(module) = analysis.modules.get_mut(module_path) {
            module.uses.extend(extract_uses(&u.tree, convert_visibility(&u.vis)));
        }
    }

    fn extract_method_signature(&self, sig: &syn::Signature) -> Method {
        let receiver = sig.inputs.first().and_then(|arg| {
            match arg {
                FnArg::Receiver(r) => {
                    if r.reference.is_some() {
                        if r.mutability.is_some() {
                            Some(MethodReceiver::SelfMutRef)
                        } else {
                            Some(MethodReceiver::SelfRef)
                        }
                    } else {
                        Some(MethodReceiver::SelfValue)
                    }
                }
                _ => None,
            }
        });

        let params = sig
            .inputs
            .iter()
            .filter_map(|arg| {
                if let FnArg::Typed(pat) = arg {
                    Some(format!("{}: {}", pat_to_string(&pat.pat), type_to_string(&pat.ty)))
                } else {
                    None
                }
            })
            .collect();

        let return_type = match &sig.output {
            ReturnType::Default => None,
            ReturnType::Type(_, ty) => Some(type_to_string(ty)),
        };

        Method {
            name: sig.ident.to_string(),
            visibility: Visibility::Private, // Will be overwritten if in impl
            is_async: sig.asyncness.is_some(),
            receiver,
            params,
            return_type,
        }
    }
}

impl Default for RustParser {
    fn default() -> Self {
        Self::new()
    }
}

/// Visitor to extract function calls
struct FunctionCallVisitor {
    calls: Vec<String>,
}

impl FunctionCallVisitor {
    fn new() -> Self {
        Self { calls: vec![] }
    }
}

impl<'ast> Visit<'ast> for FunctionCallVisitor {
    fn visit_expr_call(&mut self, node: &'ast syn::ExprCall) {
        if let Expr::Path(path) = &*node.func {
            let call_name = path
                .path
                .segments
                .iter()
                .map(|s| s.ident.to_string())
                .collect::<Vec<_>>()
                .join("::");
            self.calls.push(call_name);
        }
        syn::visit::visit_expr_call(self, node);
    }

    fn visit_expr_method_call(&mut self, node: &'ast syn::ExprMethodCall) {
        self.calls.push(node.method.to_string());
        syn::visit::visit_expr_method_call(self, node);
    }
}

fn convert_visibility(vis: &SynVisibility) -> Visibility {
    match vis {
        SynVisibility::Public(_) => Visibility::Public,
        SynVisibility::Restricted(r) => {
            let path = r
                .path
                .segments
                .iter()
                .map(|s| s.ident.to_string())
                .collect::<Vec<_>>()
                .join("::");
            if path == "crate" {
                Visibility::Crate
            } else if path == "super" {
                Visibility::Super
            } else {
                Visibility::Private
            }
        }
        SynVisibility::Inherited => Visibility::Private,
    }
}

fn extract_generics(generics: &Generics) -> Vec<String> {
    generics
        .params
        .iter()
        .map(|p| match p {
            GenericParam::Type(t) => t.ident.to_string(),
            GenericParam::Lifetime(l) => format!("'{}", l.lifetime.ident),
            GenericParam::Const(c) => format!("const {}", c.ident),
        })
        .collect()
}

fn type_to_string(ty: &Type) -> String {
    quote::quote!(#ty).to_string().replace(" ", "")
}

fn pat_to_string(pat: &Pat) -> String {
    quote::quote!(#pat).to_string()
}

fn expr_to_string(expr: &Expr) -> String {
    quote::quote!(#expr).to_string()
}

fn extract_uses(tree: &UseTree, visibility: Visibility) -> Vec<UseDef> {
    let mut uses = vec![];
    collect_use_paths(tree, String::new(), &mut uses, visibility);
    uses
}

fn collect_use_paths(tree: &UseTree, prefix: String, uses: &mut Vec<UseDef>, visibility: Visibility) {
    match tree {
        UseTree::Path(p) => {
            let new_prefix = if prefix.is_empty() {
                p.ident.to_string()
            } else {
                format!("{}::{}", prefix, p.ident)
            };
            collect_use_paths(&p.tree, new_prefix, uses, visibility.clone());
        }
        UseTree::Name(n) => {
            let path = if prefix.is_empty() {
                n.ident.to_string()
            } else {
                format!("{}::{}", prefix, n.ident)
            };
            uses.push(UseDef {
                path,
                alias: None,
                visibility: visibility.clone(),
            });
        }
        UseTree::Rename(r) => {
            let path = if prefix.is_empty() {
                r.ident.to_string()
            } else {
                format!("{}::{}", prefix, r.ident)
            };
            uses.push(UseDef {
                path,
                alias: Some(r.rename.to_string()),
                visibility: visibility.clone(),
            });
        }
        UseTree::Glob(_) => {
            let path = if prefix.is_empty() {
                "*".to_string()
            } else {
                format!("{}::*", prefix)
            };
            uses.push(UseDef {
                path,
                alias: None,
                visibility: visibility.clone(),
            });
        }
        UseTree::Group(g) => {
            for item in &g.items {
                collect_use_paths(item, prefix.clone(), uses, visibility.clone());
            }
        }
    }
}
