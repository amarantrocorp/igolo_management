module.exports = {
  content: [
    "./app/**/*.{js,tsx,ts,jsx}",
    "./components/**/*.{js,tsx,ts,jsx}",
    "./features/**/*.{js,tsx,ts,jsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#0B1120", foreground: "#F8FAFC" },
        gold: "#CBB282",
        success: "#22C55E",
        warning: "#F59E0B",
        destructive: "#EF4444",
        muted: { DEFAULT: "#F1F5F9", foreground: "#64748B" },
      },
    },
  },
  plugins: [],
};
