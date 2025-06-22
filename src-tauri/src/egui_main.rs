use eframe::{egui, App, Frame, NativeOptions};
use notter_app_lib::notes::{NoteManager, NoteSummary, NoteType};
use std::path::PathBuf;

struct NotterEgui {
    manager: NoteManager,
    notes: Vec<NoteSummary>,
    selected: Option<usize>,
    content: String,
    error: Option<String>,
    search: String,
    new_title: String,
    rename: String,
}

impl NotterEgui {
    fn new(dir: PathBuf) -> Self {
        let manager = NoteManager::new(dir);
        let notes = manager.list_notes(None).unwrap_or_default();
        Self {
            manager,
            notes,
            selected: None,
            content: String::new(),
            error: None,
            search: String::new(),
            new_title: String::new(),
            rename: String::new(),
        }
    }
}

impl App for NotterEgui {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut Frame) {
        egui::TopBottomPanel::top("controls").show(ctx, |ui| {
            ui.horizontal(|ui| {
                ui.label("Search:");
                ui.text_edit_singleline(&mut self.search);
                ui.separator();
                ui.text_edit_singleline(&mut self.new_title).hint_text("New note title");
                if ui.button("Add").clicked() && !self.new_title.trim().is_empty() {
                    match self.manager.create_note(&self.new_title, "", NoteType::Markdown, None) {
                        Ok(_) => {
                            self.new_title.clear();
                            self.notes = self.manager.list_notes(None).unwrap_or_default();
                        }
                        Err(e) => self.error = Some(e.to_string()),
                    }
                }
            });
        });

        egui::SidePanel::left("notes").show(ctx, |ui| {
            for (i, note) in self
                .notes
                .iter()
                .enumerate()
                .filter(|(_, n)| n.title.to_lowercase().contains(&self.search.to_lowercase()))
            {
                let sel = self.selected == Some(i);
                if ui.selectable_label(sel, &note.title).clicked() {
                    self.selected = Some(i);
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

            if let Some(i) = self.selected {
                ui.add(egui::TextEdit::multiline(&mut self.content).desired_rows(20));
                ui.horizontal(|ui| {
                    if ui.button("Save").clicked() {
                        if let Err(e) = self.manager.update_note_content(&self.notes[i].id, &self.content) {
                            self.error = Some(e.to_string());
                        }
                    }
                    if ui.button("Delete").clicked() {
                        if let Err(e) = self.manager.delete_note(&self.notes[i].id) {
                            self.error = Some(e.to_string());
                        } else {
                            self.selected = None;
                            self.notes = self.manager.list_notes(None).unwrap_or_default();
                        }
                    }
                });
                ui.horizontal(|ui| {
                    ui.text_edit_singleline(&mut self.rename);
                    if ui.button("Rename").clicked() {
                        if let Err(e) = self.manager.rename_note(&self.notes[i].id, &self.rename) {
                            self.error = Some(e.to_string());
                        } else {
                            self.notes = self.manager.list_notes(None).unwrap_or_default();
                        }
                    }
                });
            } else {
                ui.label("Select a note to view");
            }
        });
    }
}

fn main() -> eframe::Result<()> {
    let dir = std::env::args().nth(1).unwrap_or_else(|| "../sample-notes".into());
    let app = NotterEgui::new(PathBuf::from(dir));
    let opts = NativeOptions::default();
    eframe::run_native("Notter", opts, Box::new(|_cc| Box::new(app)))
}
