use eframe::{egui, App, Frame, NativeOptions};
use notter_app_lib::{
    config::{AppConfig, ConfigManager, AutoUpdateMode},
    notes::{Note, NoteManager, NoteSummary, NoteType},
    search::{SearchResult, SearchService},
};
use std::collections::HashSet;
use std::path::PathBuf;

#[derive(PartialEq, Eq, Clone, Copy)]
enum Tab {
    Notes,
    Chat,
    Settings,
}

struct NotterEgui {
    manager: NoteManager,
    search_service: SearchService,
    config_manager: ConfigManager,
    config: AppConfig,
    notes: Vec<NoteSummary>,
    selected_id: Option<String>,
    content: String,
    error: Option<String>,
    search: String,
    search_results: Vec<SearchResult>,
    tags: Vec<String>,
    selected_tags: Vec<String>,
    match_all_tags: bool,
    tag_search: String,
    new_title: String,
    rename: String,
    tab: Tab,
    chat_history: Vec<(String, String)>,
    chat_input: String,
}

impl NotterEgui {
    fn collect_tags(notes: &[NoteSummary]) -> Vec<String> {
        let mut set = HashSet::new();
        for n in notes {
            for t in &n.tags {
                set.insert(t.clone());
            }
        }
        let mut tags: Vec<_> = set.into_iter().collect();
        tags.sort();
        tags
    }

    fn load_full_notes(manager: &NoteManager, notes: &[NoteSummary]) -> Vec<Note> {
        notes
            .iter()
            .filter_map(|n| manager.get_note(&n.id).ok())
            .collect()
    }

    fn new(dir: PathBuf) -> Self {
        let manager = NoteManager::new(dir.clone());
        let notes = manager.list_notes(None).unwrap_or_default();
        let search_service = SearchService::new(&dir).expect("search init");
        // build initial index
        let full = Self::load_full_notes(&manager, &notes);
        let _ = search_service.rebuild_index(&full);
        let tags = Self::collect_tags(&notes);
        let config_manager = ConfigManager::new(&dir.join(".config")).unwrap();
        let config = config_manager.get_config();
        Self {
            manager,
            search_service,
            config_manager,
            config,
            notes,
            selected_id: None,
            content: String::new(),
            error: None,
            search: String::new(),
            search_results: Vec::new(),
            tags,
            selected_tags: Vec::new(),
            match_all_tags: false,
            tag_search: String::new(),
            new_title: String::new(),
            rename: String::new(),
            tab: Tab::Notes,
            chat_history: Vec::new(),
            chat_input: String::new(),
        }
    }

    fn reload_notes(&mut self) {
        if let Ok(list) = self.manager.list_notes(None) {
            self.notes = list;
            self.tags = Self::collect_tags(&self.notes);
            let full = Self::load_full_notes(&self.manager, &self.notes);
            let _ = self.search_service.rebuild_index(&full);
        }
    }
}

impl App for NotterEgui {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut Frame) {
        egui::TopBottomPanel::top("top_bar").show(ctx, |ui| {
            ui.horizontal(|ui| {
                for (tab, label) in [
                    (Tab::Notes, "Notes"),
                    (Tab::Chat, "Chat"),
                    (Tab::Settings, "Settings"),
                ] {
                    let selected = self.tab == tab;
                    if ui.selectable_label(selected, label).clicked() {
                        self.tab = tab;
                    }
                }
            });

            if self.tab == Tab::Notes {
                ui.separator();
                ui.label("Search:");
                if ui.text_edit_singleline(&mut self.search).changed() {
                    if self.search.trim().is_empty() {
                        self.search_results.clear();
                    } else if let Ok(results) = self.search_service.search(&self.search, 100) {
                        self.search_results = results;
                    }
                }
                ui.separator();
                ui.add(
                    egui::TextEdit::singleline(&mut self.new_title)
                        .hint_text("New note title"),
                );
                if ui.button("Add").clicked() && !self.new_title.trim().is_empty() {
                    match self.manager.create_note(&self.new_title, "", NoteType::Markdown, None) {
                        Ok(_) => {
                            self.new_title.clear();
                            self.reload_notes();
                        }
                        Err(e) => self.error = Some(e.to_string()),
                    }
                }
            }
        });

        if self.tab == Tab::Notes {
            egui::SidePanel::left("notes").show(ctx, |ui| {
                ui.heading("Tags");
                ui.horizontal(|ui| {
                    ui.label("Search tags:");
                    ui.text_edit_singleline(&mut self.tag_search);
                });
                ui.checkbox(&mut self.match_all_tags, "Match all tags");
                for tag in self.tags.iter().filter(|t| self.tag_search.is_empty() || t.starts_with(&self.tag_search)) {
                    let selected = self.selected_tags.contains(tag);
                    if ui.selectable_label(selected, tag).clicked() {
                        if selected {
                            self.selected_tags.retain(|x| x != tag);
                        } else {
                            self.selected_tags.push(tag.clone());
                        }
                    }
                }
                ui.separator();

                let notes_iter: Vec<NoteSummary> = if !self.search.is_empty() {
                    self.search_results.iter().map(|r| r.note.clone()).collect()
                } else {
                    self.notes.clone()
                };

                for note in notes_iter.into_iter().filter(|n| {
                    if self.selected_tags.is_empty() {
                        true
                    } else if self.match_all_tags {
                        self.selected_tags.iter().all(|t| n.tags.contains(t))
                    } else {
                        self.selected_tags.iter().any(|t| n.tags.contains(t))
                    }
                }) {
                    let sel = self.selected_id.as_deref() == Some(&note.id);
                    if ui.selectable_label(sel, &note.title).clicked() {
                        self.selected_id = Some(note.id.clone());
                        match self.manager.get_note(&note.id) {
                            Ok(n) => {
                                self.content = n.content;
                                self.rename = note.title.clone();
                            }
                            Err(e) => self.error = Some(e.to_string()),
                        }
                    }
                }
            });

            egui::CentralPanel::default().show(ctx, |ui| {
                if let Some(err) = &self.error {
                    ui.colored_label(egui::Color32::RED, err);
                }

                if let Some(id) = self.selected_id.clone() {
                    ui.add(egui::TextEdit::multiline(&mut self.content).desired_rows(20));
                    ui.horizontal(|ui| {
                        if ui.button("Save").clicked() {
                            if let Err(e) = self.manager.update_note_content(&id, &self.content) {
                                self.error = Some(e.to_string());
                            }
                        }
                        if ui.button("Delete").clicked() {
                            if let Err(e) = self.manager.delete_note(&id) {
                                self.error = Some(e.to_string());
                            } else {
                                self.selected_id = None;
                                self.reload_notes();
                            }
                        }
                    });
                    ui.horizontal(|ui| {
                        ui.text_edit_singleline(&mut self.rename);
                        if ui.button("Rename").clicked() {
                            if let Err(e) = self.manager.rename_note(&id, &self.rename) {
                                self.error = Some(e.to_string());
                            } else {
                                self.reload_notes();
                            }
                        }
                    });
                } else {
                    ui.label("Select a note to view");
                }
            });
        } else if self.tab == Tab::Chat {
            egui::CentralPanel::default().show(ctx, |ui| {
                egui::ScrollArea::vertical().show(ui, |ui| {
                    for (sender, msg) in &self.chat_history {
                        ui.label(format!("{}: {}", sender, msg));
                    }
                });
                ui.separator();
                ui.horizontal(|ui| {
                    ui.text_edit_singleline(&mut self.chat_input);
                    if ui.button("Send").clicked() && !self.chat_input.trim().is_empty() {
                        let user_msg = self.chat_input.trim().to_string();
                        self.chat_history.push(("You".into(), user_msg.clone()));
                        let reply = format!("Echo: {}", user_msg);
                        self.chat_history.push(("Bot".into(), reply));
                        self.chat_input.clear();
                    }
                });
            });
        } else if self.tab == Tab::Settings {
            egui::CentralPanel::default().show(ctx, |ui| {
                ui.heading("Settings");
                ui.label("Note naming pattern:");
                let mut pattern = self.config.note_naming_pattern.clone().unwrap_or_default();
                if ui.text_edit_singleline(&mut pattern).changed() {
                    self.config.note_naming_pattern = Some(pattern.clone());
                }
                ui.label("Default note type:");
                let mut note_type = self
                    .config
                    .default_note_type
                    .clone()
                    .unwrap_or(NoteType::Markdown);
                egui::ComboBox::from_label("")
                    .selected_text(match note_type {
                        NoteType::Markdown => "Markdown",
                        NoteType::PlainText => "PlainText",
                    })
                    .show_ui(ui, |ui| {
                        ui.selectable_value(&mut note_type, NoteType::Markdown, "Markdown");
                        ui.selectable_value(&mut note_type, NoteType::PlainText, "PlainText");
                    });
                self.config.default_note_type = Some(note_type.clone());

                ui.checkbox(&mut self.config.auto_update_search_index, "Auto update search index");

                ui.horizontal(|ui| {
                    ui.label("Update mode:");
                    egui::ComboBox::from_id_source("mode")
                        .selected_text(format!("{:?}", self.config.auto_update_mode))
                        .show_ui(ui, |ui| {
                            ui.selectable_value(&mut self.config.auto_update_mode, AutoUpdateMode::Incremental, "Incremental");
                            ui.selectable_value(&mut self.config.auto_update_mode, AutoUpdateMode::Periodic, "Periodic");
                            ui.selectable_value(&mut self.config.auto_update_mode, AutoUpdateMode::Hybrid, "Hybrid");
                        });
                });

                ui.label("Rebuild interval (minutes):");
                ui.add(egui::DragValue::new(&mut self.config.auto_update_interval).clamp_range(1..=120));

                if ui.button("Save settings").clicked() {
                    if let Some(p) = &self.config.note_naming_pattern {
                        if let Err(e) = self.config_manager.set_note_naming_pattern(p.clone()) {
                            self.error = Some(e.to_string());
                        }
                    }
                    if let Some(t) = &self.config.default_note_type {
                        if let Err(e) = self.config_manager.set_default_note_type(t.clone()) {
                            self.error = Some(e.to_string());
                        }
                    }
                    if let Err(e) = self
                        .config_manager
                        .set_auto_update_search_index(self.config.auto_update_search_index)
                    {
                        self.error = Some(e.to_string());
                    }
                    if let Err(e) = self
                        .config_manager
                        .set_auto_update_mode(self.config.auto_update_mode.clone())
                    {
                        self.error = Some(e.to_string());
                    }
                    if let Err(e) = self
                        .config_manager
                        .set_auto_update_interval(self.config.auto_update_interval)
                    {
                        self.error = Some(e.to_string());
                    }
                    self.config = self.config_manager.get_config();
                }
            });
        }
    }
}

fn main() -> eframe::Result<()> {
    let dir = std::env::args().nth(1).unwrap_or_else(|| "../sample-notes".into());
    let app = NotterEgui::new(PathBuf::from(dir));
    let opts = NativeOptions::default();
    eframe::run_native("Notter", opts, Box::new(|_cc| Box::new(app)))
}
