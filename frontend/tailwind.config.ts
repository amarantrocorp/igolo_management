import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			gold: {
  				DEFAULT: 'hsl(var(--gold))',
  				foreground: 'hsl(var(--gold-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		fontFamily: {
  			serif: ['Playfair Display', 'Georgia', 'serif'],
  			sans: ['Inter', 'system-ui', 'sans-serif'],
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' },
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' },
  			},
  			'scroll': {
  				to: { transform: 'translate(calc(-50% - 0.5rem))' },
  			},
  			'fade-in': {
  				from: { opacity: '0', transform: 'translateY(10px)' },
  				to: { opacity: '1', transform: 'translateY(0)' },
  			},
  			'fade-in-up': {
  				from: { opacity: '0', transform: 'translateY(20px)' },
  				to: { opacity: '1', transform: 'translateY(0)' },
  			},
  			'slide-in-left': {
  				from: { opacity: '0', transform: 'translateX(-20px)' },
  				to: { opacity: '1', transform: 'translateX(0)' },
  			},
  			'shimmer': {
  				from: { backgroundPosition: '0 0' },
  				to: { backgroundPosition: '-200% 0' },
  			},
  			'pulse-glow': {
  				'0%, 100%': { boxShadow: '0 0 0 0 rgba(203, 178, 130, 0.4)' },
  				'50%': { boxShadow: '0 0 20px 4px rgba(203, 178, 130, 0.2)' },
  			},
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'scroll': 'scroll var(--animation-duration, 40s) var(--animation-direction, forwards) linear infinite',
  			'fade-in': 'fade-in 0.5s ease-out forwards',
  			'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
  			'slide-in-left': 'slide-in-left 0.5s ease-out forwards',
  			'shimmer': 'shimmer 2s linear infinite',
  			'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
