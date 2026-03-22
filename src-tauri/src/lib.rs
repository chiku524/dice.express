use std::sync::Mutex;
use tauri::async_runtime::spawn;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, RunEvent, State, WindowEvent};
use tokio::time::{sleep, Duration};

struct SplashState {
    frontend_done: bool,
    backend_done: bool,
}

fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    let icon = match app.default_window_icon() {
        Some(i) => i.clone(),
        None => {
            eprintln!("[dice-express] no default window icon; tray not created");
            return Ok(());
        }
    };

    let show_i = MenuItem::with_id(app, "show", "Show dice.express", true, None::<&str>)?;
    let logout_i = MenuItem::with_id(app, "sign-out", "Sign out", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_i, &logout_i, &sep, &quit_i])?;

    let _ = TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .tooltip("dice.express")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_and_focus_main(app),
            "sign-out" => {
                let _ = app.emit("tray-sign-out", ());
                show_and_focus_main(app);
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                show_and_focus_main(app);
            }
        })
        .build(app);

    Ok(())
}

fn show_and_focus_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn attach_window_close_handlers(app: &tauri::App) -> tauri::Result<()> {
    if let Some(main) = app.get_webview_window("main") {
        let handle = app.handle().clone();
        main.on_window_event(move |event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                if let Some(w) = handle.get_webview_window("main") {
                    let _ = w.hide();
                }
            }
        });
    }

    if let Some(splash) = app.get_webview_window("splashscreen") {
        let handle = app.handle().clone();
        splash.on_window_event(move |event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = handle.exit(0);
            }
        });
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(Mutex::new(SplashState {
            frontend_done: false,
            backend_done: false,
        }))
        .invoke_handler(tauri::generate_handler![close_splash_and_show_main, set_splash_complete]);

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            show_and_focus_main(app);
        }));
    }

    let app = builder
        .setup(|app| {
            spawn(backend_setup(app.handle().clone()));
            create_tray(app.handle())?;
            attach_window_close_handlers(app)?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, event| {
        if let RunEvent::ExitRequested { api, code, .. } = event {
            if code.is_none() {
                api.prevent_exit();
            }
        }
    });
}

#[tauri::command]
async fn set_splash_complete(
    app: AppHandle,
    state: State<'_, Mutex<SplashState>>,
    task: String,
) -> Result<(), String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;
    match task.as_str() {
        "frontend" => s.frontend_done = true,
        "backend" => s.backend_done = true,
        _ => return Err("invalid task".into()),
    }
    if s.frontend_done && s.backend_done {
        let splash = app
            .get_webview_window("splashscreen")
            .ok_or("splash window not found")?;
        let main_win = app.get_webview_window("main").ok_or("main window not found")?;
        splash.destroy().map_err(|e| e.to_string())?;
        main_win.show().map_err(|e| e.to_string())?;
        main_win.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn close_splash_and_show_main(app: AppHandle) -> Result<(), String> {
    let splash = app
        .get_webview_window("splashscreen")
        .ok_or("splash window not found")?;
    let main_win = app.get_webview_window("main").ok_or("main window not found")?;
    splash.destroy().map_err(|e| e.to_string())?;
    main_win.show().map_err(|e| e.to_string())?;
    main_win.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

async fn backend_setup(app: AppHandle) {
    sleep(Duration::from_secs(1)).await;
    let both_done = {
        let state = app.try_state::<Mutex<SplashState>>();
        if let Some(s) = state {
            if let Ok(mut guard) = s.lock() {
                guard.backend_done = true;
                guard.frontend_done && guard.backend_done
            } else {
                false
            }
        } else {
            false
        }
    };
    if both_done {
        if let (Some(splash), Some(main_win)) = (
            app.get_webview_window("splashscreen"),
            app.get_webview_window("main"),
        ) {
            let _ = splash.destroy();
            let _ = main_win.show();
            let _ = main_win.set_focus();
        }
    }
}
