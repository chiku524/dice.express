use std::sync::Mutex;
use tauri::async_runtime::spawn;
use tauri::{AppHandle, Manager, State};
use tokio::time::{sleep, Duration};

struct SplashState {
    frontend_done: bool,
    backend_done: bool,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(Mutex::new(SplashState {
            frontend_done: false,
            backend_done: false,
        }))
        .invoke_handler(tauri::generate_handler![close_splash_and_show_main, set_splash_complete])
        .setup(|app| {
            spawn(backend_setup(app.handle().clone()));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
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
        splash.close().map_err(|e| e.to_string())?;
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
    splash.close().map_err(|e| e.to_string())?;
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
            let _ = splash.close();
            let _ = main_win.show();
            let _ = main_win.set_focus();
        }
    }
}
