import io
import logging
import sys
import threading
import time
import tkinter as tk
from tkinter import ttk
from typing import Any, Dict

# Safeguard against None stdout/stderr when launched via pythonw.exe on Windows
if sys.stdout is None:
    sys.stdout = io.StringIO()
if sys.stderr is None:
    sys.stderr = io.StringIO()

from telemetry.collector import service
from telemetry.collector.sim_reader import SyntheticSimulatorReader
from telemetry.config import settings
from telemetry.simulator.config import SimulationScenarioConfig
from telemetry.simulator.engine import SimulatorEngine

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("simulator_gui")


class SimulatorControlGUI:
    """
    Embedded Desktop Control Studio running SimulatorEngine and WebSocket Live Streamer
    in a unified Python process with direct memory access.
    """

    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Cold Mirror - Telemetry Simulator Studio")
        self.root.geometry("860x720")
        self.root.minsize(800, 640)

        # 1. Initialize embedded simulation engine & collector reader
        self._is_running = True
        self.scenario = SimulationScenarioConfig(target_fps=60)
        self.engine = SimulatorEngine(self.scenario)
        self.reader = SyntheticSimulatorReader(self.scenario, engine=self.engine, is_embedded=True)
        self.status_data: Dict[str, Any] = {}
        self._is_initializing = True

        # 2. Setup UI styling & widgets
        self._setup_dark_theme()
        self._build_header_bar()
        self._build_notebook_tabs()
        self._build_footer_status()
        self._is_initializing = False

        # 3. Launch dedicated physics loop (60 FPS) in background thread
        self.physics_thread = threading.Thread(target=self._run_physics_worker, daemon=True)
        self.physics_thread.start()

        # 4. Launch live telemetry WebSocket streamer in a background daemon thread
        self.streamer_thread = threading.Thread(target=self._run_streamer_worker, daemon=True)
        self.streamer_thread.start()

        # 5. Handle clean exit on window close
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

        # 6. Start in-memory UI refresh loop (20 Hz)
        self._poll_status_loop()

    def _run_physics_worker(self) -> None:
        """Dedicated background physics clock stepping simulation at 60 FPS."""
        target_dt = 1.0 / 60.0
        while self._is_running:
            start_t = time.perf_counter()
            self.engine.step()
            elapsed = time.perf_counter() - start_t
            sleep_t = target_dt - elapsed
            if sleep_t > 0:
                time.sleep(sleep_t)

    def _run_streamer_worker(self) -> None:
        """Background worker streaming simulated telemetry frames to FastAPI WebSocket."""
        while self._is_running:
            try:
                logger.info("Starting background WebSocket telemetry streamer...")
                service.run(self.reader)
            except Exception as e:
                logger.error(f"Streamer background error: {e}")
                time.sleep(2)

    def _on_close(self) -> None:
        """Signals background threads and cleanly destroys the Tkinter root."""
        logger.info("Closing Simulator Studio...")
        self._is_running = False
        self.reader.close()
        self.root.destroy()

    def _setup_dark_theme(self) -> None:
        self.bg_dark = "#121214"
        self.bg_card = "#1e1e24"
        self.bg_card_alt = "#27272a"
        self.fg_primary = "#f4f4f5"
        self.fg_muted = "#a1a1aa"
        self.accent_blue = "#3b82f6"
        self.accent_green = "#10b981"
        self.accent_red = "#ef4444"
        self.accent_yellow = "#f59e0b"

        self.root.configure(bg=self.bg_dark)

        style = ttk.Style()
        style.theme_use("clam")

        style.configure("TFrame", background=self.bg_dark)
        style.configure("Card.TFrame", background=self.bg_card, relief="flat")
        style.configure("CardAlt.TFrame", background=self.bg_card_alt, relief="flat")

        style.configure(
            "TLabel", background=self.bg_dark, foreground=self.fg_primary, font=("Segoe UI", 9)
        )
        style.configure(
            "Card.TLabel", background=self.bg_card, foreground=self.fg_primary, font=("Segoe UI", 9)
        )
        style.configure(
            "Header.TLabel",
            background=self.bg_dark,
            foreground=self.fg_primary,
            font=("Segoe UI", 12, "bold"),
        )
        style.configure(
            "Subheader.TLabel",
            background=self.bg_card,
            foreground=self.fg_muted,
            font=("Segoe UI", 8, "bold"),
        )

        style.configure("TNotebook", background=self.bg_dark, borderwidth=0)
        style.configure(
            "TNotebook.Tab",
            background=self.bg_card,
            foreground=self.fg_muted,
            padding=[14, 8],
            font=("Segoe UI", 9, "bold"),
        )
        style.map(
            "TNotebook.Tab",
            background=[("selected", self.accent_blue), ("active", self.bg_card_alt)],
            foreground=[("selected", "#ffffff"), ("active", self.fg_primary)],
        )

        style.configure(
            "TButton",
            background=self.bg_card_alt,
            foreground=self.fg_primary,
            font=("Segoe UI", 9, "bold"),
            borderwidth=1,
            focuscolor="none",
            padding=[10, 6],
        )
        style.map(
            "TButton",
            background=[("active", self.accent_blue), ("pressed", "#2563eb")],
            foreground=[("active", "#ffffff"), ("pressed", "#ffffff")],
        )

        style.configure(
            "Action.TButton",
            background="#2563eb",
            foreground="#ffffff",
            font=("Segoe UI", 9, "bold"),
            padding=[12, 6],
        )
        style.map("Action.TButton", background=[("active", "#1d4ed8")])

        style.configure(
            "Warning.TButton",
            background="#d97706",
            foreground="#ffffff",
            font=("Segoe UI", 9, "bold"),
            padding=[10, 6],
        )
        style.map("Warning.TButton", background=[("active", "#b45309")])

        style.configure(
            "Danger.TButton",
            background="#dc2626",
            foreground="#ffffff",
            font=("Segoe UI", 9, "bold"),
            padding=[10, 6],
        )
        style.map("Danger.TButton", background=[("active", "#b91c1c")])

        style.configure(
            "Success.TButton",
            background="#059669",
            foreground="#ffffff",
            font=("Segoe UI", 9, "bold"),
            padding=[10, 6],
        )
        style.map("Success.TButton", background=[("active", "#047857")])

    # --------------------------------------------------------------------------
    # HEADER BAR
    # --------------------------------------------------------------------------
    def _build_header_bar(self) -> None:
        header = ttk.Frame(self.root, style="TFrame", padding="16 12 16 10")
        header.pack(fill="x")

        title_box = ttk.Frame(header, style="TFrame")
        title_box.pack(side="left")

        ttk.Label(title_box, text="COLD MIRROR SIMULATOR STUDIO", style="Header.TLabel").pack(
            anchor="w"
        )
        self.lbl_subtitle = ttk.Label(
            title_box,
            text="Autonomous Multi-Class Telemetry Engine | SPA-FRANCORCHAMPS",
            style="TLabel",
            foreground=self.fg_muted,
            font=("Segoe UI", 8),
        )
        self.lbl_subtitle.pack(anchor="w")

        controls_box = ttk.Frame(header, style="TFrame")
        controls_box.pack(side="right")

        self.btn_pause = ttk.Button(
            controls_box,
            text="Pause Physics",
            style="Warning.TButton",
            command=self._toggle_pause,
        )
        self.btn_pause.pack(side="left", padx=4)

        self.btn_clear_all = ttk.Button(
            controls_box,
            text="Clear Hazards",
            style="TButton",
            command=self._clear_incidents,
        )
        self.btn_clear_all.pack(side="left", padx=4)

    # --------------------------------------------------------------------------
    # NOTEBOOK TABS
    # --------------------------------------------------------------------------
    def _build_notebook_tabs(self) -> None:
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill="both", expand=True, padx=16, pady=(0, 10))

        # Tab 1: Live Status & Playback
        self.tab_status = ttk.Frame(self.notebook, style="TFrame", padding=12)
        self.notebook.add(self.tab_status, text="Live Dashboard")
        self._build_tab_status_content(self.tab_status)

        # Tab 2: Hazards & Race Control
        self.tab_hazards = ttk.Frame(self.notebook, style="TFrame", padding=12)
        self.notebook.add(self.tab_hazards, text="Hazards & Race Control")
        self._build_tab_hazards_content(self.tab_hazards)

        # Tab 3: Weather & Track Studio
        self.tab_weather = ttk.Frame(self.notebook, style="TFrame", padding=12)
        self.notebook.add(self.tab_weather, text="Weather Studio")
        self._build_tab_weather_content(self.tab_weather)

        # Tab 4: Vehicle & Radar Calibration
        self.tab_vehicle = ttk.Frame(self.notebook, style="TFrame", padding=12)
        self.notebook.add(self.tab_vehicle, text="Vehicle & Radar")
        self._build_tab_vehicle_content(self.tab_vehicle)

    # --------------------------------------------------------------------------
    # TAB 1: Live Status & Playback
    # --------------------------------------------------------------------------
    def _build_tab_status_content(self, parent: ttk.Frame) -> None:
        metrics_frame = ttk.Frame(parent, style="TFrame")
        metrics_frame.pack(fill="x", pady=(0, 12))

        # Card 1: Session Clock & Laps
        c1 = ttk.Frame(metrics_frame, style="Card.TFrame", padding=12)
        c1.pack(side="left", fill="both", expand=True, padx=(0, 6))
        ttk.Label(c1, text="SESSION TIME", style="Subheader.TLabel").pack(anchor="w")
        self.lbl_clock = ttk.Label(
            c1, text="00:00 / 30:00", font=("Segoe UI", 16, "bold"), style="Card.TLabel"
        )
        self.lbl_clock.pack(anchor="w", pady=(4, 0))
        self.lbl_lap = ttk.Label(
            c1, text="Lap 1 / 15", foreground=self.fg_muted, style="Card.TLabel"
        )
        self.lbl_lap.pack(anchor="w")

        # Card 2: Speed & Gear
        c2 = ttk.Frame(metrics_frame, style="Card.TFrame", padding=12)
        c2.pack(side="left", fill="both", expand=True, padx=6)
        ttk.Label(c2, text="PLAYER TELEMETRY", style="Subheader.TLabel").pack(anchor="w")
        self.lbl_speed_gear = ttk.Label(
            c2, text="0 km/h | N", font=("Segoe UI", 16, "bold"), style="Card.TLabel"
        )
        self.lbl_speed_gear.pack(anchor="w", pady=(4, 0))
        self.lbl_rpm_throttle = ttk.Label(
            c2, text="RPM: 0 | Thr: 0%", foreground=self.fg_muted, style="Card.TLabel"
        )
        self.lbl_rpm_throttle.pack(anchor="w")

        # Card 3: Race Flags & Track Grip
        c3 = ttk.Frame(metrics_frame, style="Card.TFrame", padding=12)
        c3.pack(side="left", fill="both", expand=True, padx=(6, 0))
        ttk.Label(c3, text="FLAG & GRIP STATUS", style="Subheader.TLabel").pack(anchor="w")
        self.lbl_flag_status = ttk.Label(
            c3,
            text="GREEN FLAG",
            font=("Segoe UI", 15, "bold"),
            foreground=self.accent_green,
            style="Card.TLabel",
        )
        self.lbl_flag_status.pack(anchor="w", pady=(4, 0))
        self.lbl_grip_status = ttk.Label(
            c3, text="Track Grip: 100%", foreground=self.fg_muted, style="Card.TLabel"
        )
        self.lbl_grip_status.pack(anchor="w")

        # Lap Progress & Sector Bar
        progress_box = ttk.Frame(parent, style="Card.TFrame", padding=12)
        progress_box.pack(fill="x", pady=(0, 12))
        ttk.Label(progress_box, text="TRACK POSITION & SECTORS", style="Subheader.TLabel").pack(
            anchor="w"
        )

        self.progress_bar = ttk.Progressbar(
            progress_box, orient="horizontal", mode="determinate", length=400
        )
        self.progress_bar.pack(fill="x", pady=(6, 4))

        self.lbl_sector_info = ttk.Label(
            progress_box,
            text="Sector: 1 | Distance: 0.0% | Pit Road: NO",
            style="Card.TLabel",
            foreground=self.fg_muted,
        )
        self.lbl_sector_info.pack(anchor="w")

        # Playback Speed Slider Box
        speed_box = ttk.Frame(parent, style="Card.TFrame", padding=12)
        speed_box.pack(fill="x")
        ttk.Label(speed_box, text="SIMULATION SPEED ACCELERATOR", style="Subheader.TLabel").pack(
            anchor="w"
        )

        slider_row = ttk.Frame(speed_box, style="Card.TFrame")
        slider_row.pack(fill="x", pady=(6, 0))

        self.speed_scale = ttk.Scale(
            slider_row,
            from_=0.25,
            to=5.0,
            value=1.0,
            orient="horizontal",
            command=self._on_speed_scale_change,
        )
        self.speed_scale.pack(side="left", fill="x", expand=True, padx=(0, 10))

        self.lbl_speed_mult = ttk.Label(
            slider_row,
            text="1.00x",
            font=("Segoe UI", 11, "bold"),
            foreground=self.accent_blue,
            style="Card.TLabel",
        )
        self.lbl_speed_mult.pack(side="left", padx=6)

        # Quick Preset Buttons
        presets_row = ttk.Frame(speed_box, style="Card.TFrame")
        presets_row.pack(fill="x", pady=(8, 0))
        for spd in [0.5, 1.0, 2.0, 4.0]:
            ttk.Button(
                presets_row,
                text=f"{spd}x",
                command=lambda s=spd: self._set_speed(s),
            ).pack(side="left", padx=(0, 4))

    # --------------------------------------------------------------------------
    # TAB 2: Hazards & Race Control
    # --------------------------------------------------------------------------
    def _build_tab_hazards_content(self, parent: ttk.Frame) -> None:
        # Yellow Flags by Sector
        yellow_box = ttk.Frame(parent, style="Card.TFrame", padding=12)
        yellow_box.pack(fill="x", pady=(0, 10))
        ttk.Label(
            yellow_box, text="LOCAL CAUTION FLAGS (SECTOR YELLOWS)", style="Subheader.TLabel"
        ).pack(anchor="w", pady=(0, 8))

        y_row = ttk.Frame(yellow_box, style="Card.TFrame")
        y_row.pack(fill="x", pady=(0, 8))

        ttk.Button(
            y_row,
            text="Sector 1 Caution (25s)",
            style="Warning.TButton",
            command=lambda: self._trigger_yellow(1),
        ).pack(side="left", fill="x", expand=True, padx=(0, 3))
        ttk.Button(
            y_row,
            text="Sector 2 Caution (25s)",
            style="Warning.TButton",
            command=lambda: self._trigger_yellow(2),
        ).pack(side="left", fill="x", expand=True, padx=3)
        ttk.Button(
            y_row,
            text="Sector 3 Caution (25s)",
            style="Warning.TButton",
            command=lambda: self._trigger_yellow(3),
        ).pack(side="left", fill="x", expand=True, padx=(3, 0))

        dur_row = ttk.Frame(yellow_box, style="Card.TFrame")
        dur_row.pack(fill="x")
        ttk.Label(dur_row, text="Duration:", style="Card.TLabel", foreground=self.fg_muted).pack(
            side="left"
        )
        self.yellow_dur_scale = ttk.Scale(dur_row, from_=5, to=60, value=25, orient="horizontal")
        self.yellow_dur_scale.pack(side="left", fill="x", expand=True, padx=10)

        # Full Course Yellow / Safety Car
        sc_box = ttk.Frame(parent, style="Card.TFrame", padding=12)
        sc_box.pack(fill="x", pady=(0, 10))
        ttk.Label(sc_box, text="FULL COURSE CAUTION / SAFETY CAR", style="Subheader.TLabel").pack(
            anchor="w", pady=(0, 8)
        )

        sc_row = ttk.Frame(sc_box, style="Card.TFrame")
        sc_row.pack(fill="x")
        self.btn_safety_car = ttk.Button(
            sc_row,
            text="DEPLOY SAFETY CAR (SC)",
            style="Danger.TButton",
            command=self._toggle_safety_car,
        )
        self.btn_safety_car.pack(side="left", fill="x", expand=True, padx=(0, 4))

        # Vehicle Incidents (Damage & Punctures)
        dmg_box = ttk.Frame(parent, style="Card.TFrame", padding=12)
        dmg_box.pack(fill="x")
        ttk.Label(dmg_box, text="VEHICLE MECHANICAL HAZARDS", style="Subheader.TLabel").pack(
            anchor="w", pady=(0, 8)
        )

        dmg_row = ttk.Frame(dmg_box, style="Card.TFrame")
        dmg_row.pack(fill="x")
        ttk.Button(
            dmg_row,
            text="Trigger Tire Puncture",
            style="Danger.TButton",
            command=lambda: self._trigger_damage(True),
        ).pack(side="left", fill="x", expand=True, padx=(0, 3))
        ttk.Button(
            dmg_row,
            text="Trigger Aero Damage",
            style="Warning.TButton",
            command=lambda: self._trigger_damage(False),
        ).pack(side="left", fill="x", expand=True, padx=3)
        ttk.Button(
            dmg_row, text="Instant Repair", style="Success.TButton", command=self._repair_damage
        ).pack(side="left", fill="x", expand=True, padx=(3, 0))

    # --------------------------------------------------------------------------
    # TAB 3: Weather & Track Studio
    # --------------------------------------------------------------------------
    def _build_tab_weather_content(self, parent: ttk.Frame) -> None:
        weather_box = ttk.Frame(parent, style="Card.TFrame", padding=12)
        weather_box.pack(fill="x", pady=(0, 10))
        ttk.Label(
            weather_box, text="DYNAMIC METEOROLOGY & TRACK CONDITIONS", style="Subheader.TLabel"
        ).pack(anchor="w", pady=(0, 10))

        # Rain Intensity Slider
        r_box = ttk.Frame(weather_box, style="Card.TFrame")
        r_box.pack(fill="x", pady=(0, 6))
        ttk.Label(r_box, text="Rainfall Rate (0..100%):", style="Card.TLabel", width=22).pack(
            side="left"
        )
        self.scale_rain = ttk.Scale(
            r_box, from_=0.0, to=1.0, value=0.0, command=self._on_weather_change
        )
        self.scale_rain.pack(side="left", fill="x", expand=True, padx=8)
        self.lbl_rain_val = ttk.Label(
            r_box, text="0%", width=6, style="Card.TLabel", font=("Segoe UI", 9, "bold")
        )
        self.lbl_rain_val.pack(side="left")

        # Track Temperature Slider
        t_box = ttk.Frame(weather_box, style="Card.TFrame")
        t_box.pack(fill="x", pady=(0, 6))
        ttk.Label(t_box, text="Track Temperature (C):", style="Card.TLabel", width=22).pack(
            side="left"
        )
        self.scale_track_temp = ttk.Scale(
            t_box, from_=10.0, to=50.0, value=28.0, command=self._on_weather_change
        )
        self.scale_track_temp.pack(side="left", fill="x", expand=True, padx=8)
        self.lbl_track_temp_val = ttk.Label(
            t_box, text="28.0 C", width=6, style="Card.TLabel", font=("Segoe UI", 9, "bold")
        )
        self.lbl_track_temp_val.pack(side="left")

        # Air Temperature Slider
        a_box = ttk.Frame(weather_box, style="Card.TFrame")
        a_box.pack(fill="x")
        ttk.Label(a_box, text="Air Temperature (C):", style="Card.TLabel", width=22).pack(
            side="left"
        )
        self.scale_air_temp = ttk.Scale(
            a_box, from_=5.0, to=40.0, value=21.5, command=self._on_weather_change
        )
        self.scale_air_temp.pack(side="left", fill="x", expand=True, padx=8)
        self.lbl_air_temp_val = ttk.Label(
            a_box, text="21.5 C", width=6, style="Card.TLabel", font=("Segoe UI", 9, "bold")
        )
        self.lbl_air_temp_val.pack(side="left")

        # Quick Weather Presets
        presets_box = ttk.Frame(parent, style="Card.TFrame", padding=12)
        presets_box.pack(fill="x")
        ttk.Label(presets_box, text="QUICK WEATHER PRESETS", style="Subheader.TLabel").pack(
            anchor="w", pady=(0, 8)
        )

        p_row = ttk.Frame(presets_box, style="Card.TFrame")
        p_row.pack(fill="x")

        ttk.Button(
            p_row,
            text="Dry & Sunny",
            command=lambda: self._apply_weather_preset(rain=0.0, track=32.0, air=24.0),
        ).pack(side="left", fill="x", expand=True, padx=(0, 3))
        ttk.Button(
            p_row,
            text="Light Drizzle",
            command=lambda: self._apply_weather_preset(rain=0.35, track=22.0, air=19.0),
        ).pack(side="left", fill="x", expand=True, padx=3)
        ttk.Button(
            p_row,
            text="Heavy Torrential",
            command=lambda: self._apply_weather_preset(rain=0.90, track=16.0, air=14.0),
        ).pack(side="left", fill="x", expand=True, padx=3)
        ttk.Button(
            p_row,
            text="Drying Track",
            command=lambda: self._apply_weather_preset(rain=0.0, track=25.0, air=20.0),
        ).pack(side="left", fill="x", expand=True, padx=(3, 0))

    # --------------------------------------------------------------------------
    # TAB 4: Vehicle & Radar Calibration
    # --------------------------------------------------------------------------
    def _build_tab_vehicle_content(self, parent: ttk.Frame) -> None:
        pit_box = ttk.Frame(parent, style="Card.TFrame", padding=12)
        pit_box.pack(fill="x", pady=(0, 10))
        ttk.Label(pit_box, text="PIT OPERATIONS & FUEL SERVICE", style="Subheader.TLabel").pack(
            anchor="w", pady=(0, 10)
        )

        pit_btns = ttk.Frame(pit_box, style="Card.TFrame")
        pit_btns.pack(fill="x")

        ttk.Button(
            pit_btns,
            text="REQUEST BOX (PIT IN-LAP)",
            style="Warning.TButton",
            command=self._force_pit_stop,
        ).pack(side="left", fill="x", expand=True, padx=(0, 4))
        ttk.Button(
            pit_btns,
            text="INSTANT REFUEL (100%)",
            style="Success.TButton",
            command=self._instant_refuel,
        ).pack(side="left", fill="x", expand=True, padx=4)

        # Spotter & Radar Override Section
        radar_box = ttk.Frame(parent, style="Card.TFrame", padding=12)
        radar_box.pack(fill="x")
        ttk.Label(
            radar_box, text="SPOTTER & RADAR CALIBRATION / OVERRIDE", style="Subheader.TLabel"
        ).pack(anchor="w", pady=(0, 10))

        radio_row = ttk.Frame(radar_box, style="Card.TFrame")
        radio_row.pack(fill="x", pady=(0, 10))

        self.spotter_mode_var = tk.IntVar(value=0)
        modes = [
            ("Auto (Physics)", 0),
            ("Force Clear", 1),
            ("Force Car Left", 2),
            ("Force Car Right", 3),
            ("Force 3-Wide", 4),
        ]
        for text, val in modes:
            rb = tk.Radiobutton(
                radio_row,
                text=text,
                variable=self.spotter_mode_var,
                value=val,
                command=self._on_spotter_mode_change,
                bg=self.bg_card,
                fg=self.fg_primary,
                selectcolor=self.bg_card_alt,
                activebackground=self.bg_card,
                activeforeground=self.fg_primary,
                font=("Segoe UI", 9),
            )
            rb.pack(side="left", padx=6)

        # 2D Radar Canvas Visualization
        radar_vis = ttk.Frame(radar_box, style="Card.TFrame")
        radar_vis.pack(fill="x")

        self.radar_canvas = tk.Canvas(
            radar_vis, width=320, height=130, bg=self.bg_card_alt, highlightthickness=0
        )
        self.radar_canvas.pack(pady=4)
        self._draw_radar_schematic(spotter_code=0)

    def _draw_radar_schematic(self, spotter_code: int) -> None:
        """Draws 2D proxy schematic of player and adjacent cars."""
        self.radar_canvas.delete("all")
        cx, cy = 160, 65

        # Track lane guides
        self.radar_canvas.create_line(70, 0, 70, 130, fill="#3f3f46", dash=(4, 4))
        self.radar_canvas.create_line(250, 0, 250, 130, fill="#3f3f46", dash=(4, 4))

        # Player Car (Center Green/Blue box)
        self.radar_canvas.create_rectangle(
            cx - 18, cy - 32, cx + 18, cy + 32, fill="#3b82f6", outline="#60a5fa", width=2
        )
        self.radar_canvas.create_text(
            cx, cy, text="YOU", fill="#ffffff", font=("Segoe UI", 8, "bold")
        )

        # Left Car (CarLeft = 2 or 3-Wide = 4)
        left_color = "#ef4444" if spotter_code in (2, 4) else "#3f3f46"
        left_text_color = "#ffffff" if spotter_code in (2, 4) else "#71717a"
        self.radar_canvas.create_rectangle(
            cx - 72, cy - 30, cx - 40, cy + 30, fill=left_color, outline="#71717a"
        )
        self.radar_canvas.create_text(
            cx - 56, cy, text="LEFT", fill=left_text_color, font=("Segoe UI", 7, "bold")
        )

        # Right Car (CarRight = 3 or 3-Wide = 4)
        right_color = "#ef4444" if spotter_code in (3, 4) else "#3f3f46"
        right_text_color = "#ffffff" if spotter_code in (3, 4) else "#71717a"
        self.radar_canvas.create_rectangle(
            cx + 40, cy - 30, cx + 72, cy + 30, fill=right_color, outline="#71717a"
        )
        self.radar_canvas.create_text(
            cx + 56, cy, text="RIGHT", fill=right_text_color, font=("Segoe UI", 7, "bold")
        )

    # --------------------------------------------------------------------------
    # FOOTER BAR
    # --------------------------------------------------------------------------
    def _build_footer_status(self) -> None:
        footer = ttk.Frame(self.root, style="TFrame", padding="12 4 12 8")
        footer.pack(fill="x", side="bottom")

        server_target = f"{settings.server_url}/api/v1/ws/telemetry/publish"
        self.lbl_footer_status = ttk.Label(
            footer,
            text=f"Server Target: {server_target} | Engine: Running (60 FPS)",
            font=("Segoe UI", 8),
            foreground=self.fg_muted,
        )
        self.lbl_footer_status.pack(side="left")

        self.lbl_last_action = ttk.Label(
            footer,
            text="State: Running in Memory",
            font=("Segoe UI", 8, "bold"),
            foreground=self.accent_blue,
        )
        self.lbl_last_action.pack(side="right")

    # --------------------------------------------------------------------------
    # DIRECT IN-MEMORY ACTIONS
    # --------------------------------------------------------------------------
    def _toggle_pause(self) -> None:
        is_paused = self.engine.toggle_pause()
        self.btn_pause.configure(text="Resume Physics" if is_paused else "Pause Physics")
        self.lbl_last_action.configure(text=f"Action: {'Paused' if is_paused else 'Resumed'}")

    def _set_speed(self, factor: float) -> None:
        self.speed_scale.set(factor)
        self.lbl_speed_mult.configure(text=f"{factor:.2f}x")
        self.engine.set_speed(factor)
        self.lbl_last_action.configure(text=f"Action: Speed set to {factor}x")

    def _on_speed_scale_change(self, val: str) -> None:
        if getattr(self, "_is_initializing", False):
            return
        factor = round(float(val), 2)
        if hasattr(self, "lbl_speed_mult"):
            self.lbl_speed_mult.configure(text=f"{factor:.2f}x")
        self.engine.set_speed(factor)
        self.lbl_last_action.configure(text=f"Action: Speed set to {factor}x")

    def _trigger_yellow(self, sector: int) -> None:
        dur = float(self.yellow_dur_scale.get())
        self.engine.trigger_yellow(sector=sector, duration_s=dur)
        self.lbl_last_action.configure(text=f"Action: Caution Sector {sector} ({int(dur)}s)")

    def _toggle_safety_car(self) -> None:
        active = self.engine.toggle_safety_car()
        self.lbl_last_action.configure(
            text=f"Action: Safety Car {'Deployed' if active else 'Recalled'}"
        )

    def _trigger_damage(self, puncture: bool = False) -> None:
        self.engine.trigger_damage(car_idx=9, puncture=puncture, repair=False)
        self.lbl_last_action.configure(
            text=f"Action: Triggered {'Puncture' if puncture else 'Aero Damage'}"
        )

    def _repair_damage(self) -> None:
        self.engine.trigger_damage(car_idx=9, repair=True)
        self.lbl_last_action.configure(text="Action: Repaired Vehicle")

    def _clear_incidents(self) -> None:
        self.engine.clear_incidents()
        self.lbl_last_action.configure(text="Action: Cleared all hazards & flags")

    def _on_weather_change(self, _=None) -> None:
        if getattr(self, "_is_initializing", False):
            return
        rain = float(self.scale_rain.get()) if hasattr(self, "scale_rain") else 0.0
        track_temp = (
            float(self.scale_track_temp.get()) if hasattr(self, "scale_track_temp") else 28.0
        )
        air_temp = float(self.scale_air_temp.get()) if hasattr(self, "scale_air_temp") else 21.5

        if hasattr(self, "lbl_rain_val"):
            self.lbl_rain_val.configure(text=f"{int(rain * 100)}%")
        if hasattr(self, "lbl_track_temp_val"):
            self.lbl_track_temp_val.configure(text=f"{track_temp:.1f} C")
        if hasattr(self, "lbl_air_temp_val"):
            self.lbl_air_temp_val.configure(text=f"{air_temp:.1f} C")

        self.engine.set_weather(rain=rain, track_temp=track_temp, air_temp=air_temp)
        self.lbl_last_action.configure(text="Action: Updated weather parameters")

    def _apply_weather_preset(self, rain: float, track: float, air: float) -> None:
        self.scale_rain.set(rain)
        self.scale_track_temp.set(track)
        self.scale_air_temp.set(air)
        self._on_weather_change()

    def _force_pit_stop(self) -> None:
        self.engine.force_pit_stop(car_idx=9)
        self.lbl_last_action.configure(text="Action: Requested Pit Box (In-Lap)")

    def _instant_refuel(self) -> None:
        self.engine.refuel(car_idx=9, refuel_full=True)
        self.lbl_last_action.configure(text="Action: Instant 100% Refuel")

    def _on_spotter_mode_change(self) -> None:
        if getattr(self, "_is_initializing", False):
            return
        mode = self.spotter_mode_var.get()
        self.engine.set_spotter_override(mode)
        self.lbl_last_action.configure(text=f"Action: Spotter Mode {mode}")

    # --------------------------------------------------------------------------
    # DIRECT IN-MEMORY UI REFRESH LOOP
    # --------------------------------------------------------------------------
    def _poll_status_loop(self) -> None:
        data = self.engine.get_status()
        self._update_ui_from_status(data)
        # Refresh UI at 20 Hz (50 ms)
        self.root.after(50, self._poll_status_loop)

    def _update_ui_from_status(self, data: Dict[str, Any]) -> None:
        self.status_data = data

        # 1. Clocks & Laps
        session_time = data.get("session_time", 0.0)
        total_dur = session_time + data.get("session_time_remain", 1800.0)
        m_curr, s_curr = divmod(int(session_time), 60)
        m_tot, s_tot = divmod(int(total_dur), 60)
        self.lbl_clock.configure(text=f"{m_curr:02d}:{s_curr:02d} / {m_tot:02d}:{s_tot:02d}")

        lap = data.get("lap", 1)
        total_laps = lap + data.get("session_laps_remain", 15)
        self.lbl_lap.configure(text=f"Lap {lap} / {total_laps}")

        # 2. Player Dynamics
        speed = data.get("player_speed_kmh", 0.0)
        gear = data.get("player_gear", 0)
        gear_str = "R" if gear == -1 else "N" if gear == 0 else str(gear)
        self.lbl_speed_gear.configure(text=f"{int(speed)} km/h | Gear {gear_str}")

        rpm = data.get("player_rpm", 0.0)
        throttle = int(data.get("player_throttle", 0.0) * 100)
        brake = int(data.get("player_brake", 0.0) * 100)
        fuel = data.get("fuel_level", 0.0)
        self.lbl_rpm_throttle.configure(
            text=f"RPM: {int(rpm)} | Thr: {throttle}% | Brk: {brake}% | Fuel: {fuel:.1f}L"
        )

        # 3. Flags & Grip
        flags = data.get("flags", {})
        grip_factor = data.get("grip_factor", 1.0)

        if flags.get("is_safety_car_active", False):
            self.lbl_flag_status.configure(text="SAFETY CAR (SC)", foreground=self.accent_red)
        elif flags.get("is_caution_waving", False):
            self.lbl_flag_status.configure(text="YELLOW FLAG", foreground=self.accent_yellow)
        else:
            self.lbl_flag_status.configure(text="GREEN FLAG", foreground=self.accent_green)

        rain_pct = int(data.get("rain_intensity", 0.0) * 100)
        self.lbl_grip_status.configure(text=f"Grip: {int(grip_factor * 100)}% | Rain: {rain_pct}%")

        # 4. Track Progress & Sectors
        dist_pct = data.get("player_lap_dist_pct", 0.0)
        sector_id = data.get("sector_id", 1)
        self.progress_bar["value"] = dist_pct * 100

        pit_str = "YES" if data.get("on_pit_road", False) else "NO"
        punc_str = " [PUNCTURE]" if data.get("is_punctured", False) else ""
        self.lbl_sector_info.configure(
            text=f"Sector: {sector_id} | Dist: {dist_pct * 100:.1f}% | Pit Road: {pit_str}{punc_str}"
        )

        # 5. Radar
        spotter_code = data.get("car_left_right", 0)
        self._draw_radar_schematic(spotter_code)


if __name__ == "__main__":
    root = tk.Tk()
    app = SimulatorControlGUI(root)
    root.mainloop()
