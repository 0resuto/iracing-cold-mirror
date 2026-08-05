import os
import re

replacements = {
    r"c:\Users\Engineer\Desktop\Cold mirror\frontend\src\App.jsx": [
        (
            r'className="flex-1 flex flex-col h-full overflow-hidden gap-3 sm:gap-4 md:gap-6 bg-brand-bg min-w-0" style={{ padding: \'12px 16px\' }}',
            r'className="flex-1 flex flex-col h-full overflow-hidden gap-3 sm:gap-4 md:gap-6 bg-brand-bg min-w-0 px-4 py-3"',
        )
    ],
    r"c:\Users\Engineer\Desktop\Cold mirror\frontend\src\components\Sidebar.jsx": [
        (
            r'className="flex md:hidden items-center justify-between bg-bg-base border-b border-border-strong flex-none gap-3 min-h-\[60px\]" style={{ padding: \'16px 20px\' }}',
            r'className="flex md:hidden items-center justify-between bg-bg-base border-b border-border-strong flex-none gap-3 min-h-[60px] px-5 py-4"',
        ),
        (
            r'className="flex-1 overflow-y-auto custom-scrollbar min-w-0" style={{ padding: \'12px 0\' }}',
            r'className="flex-1 overflow-y-auto custom-scrollbar min-w-0 py-3"',
        ),
        (
            r'className="border-t border-brand-60 bg-black/10 flex-none min-w-0" style={{ padding: \'6px 20px\' }}',
            r'className="border-t border-brand-60 bg-black/10 flex-none min-w-0 px-5 py-1.5"',
        ),
    ],
    r"c:\Users\Engineer\Desktop\Cold mirror\frontend\src\components\sidebar\FilterControls.jsx": [
        (
            r'className="bg-brand-bg border-b border-brand-60 flex-none flex flex-col gap-2 min-w-0" style={{ padding: \'12px 16px\' }}',
            r'className="bg-brand-bg border-b border-brand-60 flex-none flex flex-col gap-2 min-w-0 px-4 py-3"',
        ),
        (
            r'className="absolute inset-y-0 left-0 flex items-center pointer-events-none text-brand-10/40" style={{ paddingLeft: \'12px\' }}',
            r'className="absolute inset-y-0 left-0 flex items-center pointer-events-none text-brand-10/40 pl-3"',
        ),
        (
            r'className="architectural-input text-xs font-mono"\s*style={{ paddingLeft: \'36px\', paddingRight: \'30px\' }}',
            r'className="architectural-input text-xs font-mono pl-9 pr-8"',
        ),
    ],
    r"c:\Users\Engineer\Desktop\Cold mirror\frontend\src\components\sidebar\LapItem.jsx": [
        (
            r"      onClick={handleClick}\s*style={{ padding: \'4px 10px\' }}\s*className={`group",
            r"      onClick={handleClick}\n      className={`px-2.5 py-1 group",
        )
    ],
    r"c:\Users\Engineer\Desktop\Cold mirror\frontend\src\components\sidebar\PlayerItem.jsx": [
        (
            r"        onClick={\(\) => setIsOpen\(!isOpen\)}\s*style={{ padding: \'8px 14px\' }}\s*className={`flex",
            r"        onClick={() => setIsOpen(!isOpen)}\n        className={`px-3.5 py-2 flex",
        ),
        (
            r'        <div className="flex flex-col bg-black/60 min-w-0 gap-2" style={{ padding: \'8px 8px 8px 8px\' }}>',
            r'        <div className="flex flex-col bg-black/60 min-w-0 gap-2 p-2">',
        ),
    ],
    r"c:\Users\Engineer\Desktop\Cold mirror\frontend\src\components\sidebar\SectorsWidget.jsx": [
        (
            r'className="border-t border-brand-60 bg-brand-bg flex-none flex flex-col min-w-0" style={{ padding: \'16px 20px\' }}',
            r'className="border-t border-brand-60 bg-brand-bg flex-none flex flex-col min-w-0 px-5 py-4"',
        ),
        (
            r'className="flex justify-between items-center text-xs bg-brand-60 rounded-lg border border-brand-60/80 min-w-0" style={{ padding: \'4px 14px\' }}',
            r'className="flex justify-between items-center text-xs bg-brand-60 rounded-lg border border-brand-60/80 min-w-0 px-3.5 py-1"',
        ),
    ],
    r"c:\Users\Engineer\Desktop\Cold mirror\frontend\src\components\sidebar\SessionItem.jsx": [
        (
            r"        onClick={\(\) => setIsOpen\(!isOpen\)}\s*style={{ padding: \'8px 10px\' }}\s*className={`flex",
            r"        onClick={() => setIsOpen(!isOpen)}\n        className={`px-2.5 py-2 flex",
        ),
        (r"style={{ paddingLeft: \'4px\', paddingRight: \'4px\' }}", r'className="px-1"'),
        (
            r'          <div className="flex flex-col gap-1 relative z-10 min-w-0 py-1" className="px-1">',
            r'          <div className="flex flex-col gap-1 relative z-10 min-w-0 py-1 px-1">',
        ),
        (
            r'                    onClick={\(\) => setShowAllLaps\(true\)}\s*style={{ padding: \'8px 16px\' }}\s*className="mt-1',
            r'                    onClick={() => setShowAllLaps(true)}\n                    className="px-4 py-2 mt-1',
        ),
    ],
    r"c:\Users\Engineer\Desktop\Cold mirror\frontend\src\components\sidebar\LiveStreamPanel.jsx": [
        (
            r'className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar min-w-0" style={{ padding: \'20px\' }}',
            r'className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar min-w-0 p-5"',
        ),
        (
            r'className="bg-brand-bg border border-brand-60 rounded-xl flex flex-col gap-3" style={{ padding: \'16px\' }}',
            r'className="bg-brand-bg border border-brand-60 rounded-xl flex flex-col gap-3 p-4"',
        ),
        (
            r'className="text-xs text-amber-400/90 leading-relaxed bg-amber-500/10 rounded-xl border border-amber-500/20" style={{ padding: \'16px\' }}',
            r'className="text-xs text-amber-400/90 leading-relaxed bg-amber-500/10 rounded-xl border border-amber-500/20 p-4"',
        ),
    ],
    r"c:\Users\Engineer\Desktop\Cold mirror\frontend\src\components\sidebar\SystemPanel.jsx": [
        (
            r'className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar min-w-0" style={{ padding: \'20px\' }}',
            r'className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar min-w-0 p-5"',
        ),
        (
            r'className="bg-brand-bg rounded-xl border border-brand-60 flex flex-col gap-3" style={{ padding: \'16px\' }}',
            r'className="bg-brand-bg rounded-xl border border-brand-60 flex flex-col gap-3 p-4"',
        ),
        (
            r'className="bg-brand-bg rounded-xl border border-brand-60 flex flex-col gap-2.5" style={{ padding: \'16px\' }}',
            r'className="bg-brand-bg rounded-xl border border-brand-60 flex flex-col gap-2.5 p-4"',
        ),
    ],
    r"c:\Users\Engineer\Desktop\Cold mirror\frontend\src\components\sidebar\TrackItem.jsx": [
        (
            r"        onClick={\(\) => setIsOpen\(!isOpen\)}\s*style={{ padding: \'6px 12px\' }}\s*className={`flex",
            r"        onClick={() => setIsOpen(!isOpen)}\n        className={`px-3 py-1.5 flex",
        ),
        (r"style={{ paddingLeft: \'4px\' }}", r'className="pl-1"'),
        (
            r'          <div className="flex flex-col gap-1.5 relative z-10 min-w-0" className="pl-1">',
            r'          <div className="flex flex-col gap-1.5 relative z-10 min-w-0 pl-1">',
        ),
    ],
}

for filepath, reps in replacements.items():
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        new_content = content
        for old, new in reps:
            new_content = re.sub(old, new, new_content)
        if new_content != content:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Updated {os.path.basename(filepath)}")
