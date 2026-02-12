# UI/UX Modernization Plan

## 1. Goal
Transform the `igolo-interior` application into a visually stunning, modern, and premium interior design platform. The redesign will verify aesthetic appeal through high-end animations and interactive elements while maintaining usability.

## 2. Technology Stack & Tools
*   **Framer Motion**: For complex React interactions, layout transitions, and gesture-based animations.
*   **GSAP (GreenSock)**: For high-performance, timeline-based sequences and scroll-triggered effects (ScrollTrigger).
*   **Aceternity UI**: For pre-built, high-quality modern components (e.g., Hero Parallax, Bento Grids, Moving Borders).
*   **Tailwind CSS**: Utilizing the existing setup for rapid styling and custom animations.

## 3. Design Strategy
*   **Theme**: "Modern Luxury". Deep charcoal/slate backgrounds with gold/bronze accents for the dashboard (Dark Mode), and crisp white/beige with serif typography for the public landing page (Light Mode).
*   **Typography**: Integrate a premium serif font (e.g., *Playfair Display*) for headings and a clean sans-serif (e.g., *Inter* or *Manrope*) for UI text.
*   **Interactions**:
    *   **Micro**: Subtle hover states, button scales, and input focuses.
    *   **Macro**: Page transitions, staggered content loading, and scroll-parallax.

## 4. Implementation Steps

### Phase 1: Setup & Dependencies
1.  **Install Core Libraries**:
    ```bash
    npm install framer-motion gsap @gsap/react
    npm install -D framer-motion clsx tailwind-merge
    ```
2.  **Configure Tailwind**:
    *   Update `tailwind.config.ts` to include custom animation keyframes and extended color palette.
    *   Add utility helper `cn` (ClassValue) if not already present (standard for Aceternity/Shadcn).
3.  **Utils Setup**:
    *   Ensure `lib/utils.ts` exists for class merging.

### Phase 2: Landing Page Overhaul (`app/page.tsx`)
*   **Hero Section**:
    *   Implement **Aceternity Hero Parallax**: A scrolling effect showing a grid of interior design project images that move at different speeds.
    *   *Alternative*: **Aurora Background** with a grand, centered typography reveal using GSAP SplitText.
*   **Features/Services Section**:
    *   Implement **Bento Grid**: A grid layout for "Interior Design", "Architecture", "Consultation" services.
    *   Add **Hover Effect Cards**: Cards that glow or scale slightly on hover.
*   **Testimonials**:
    *   Implement **Infinite Moving Cards**: A seamless horizontal scroll of client reviews.
*   **Footer**:
    *   Large, typography-driven footer with `SVG` path animations.

### Phase 3: Dashboard Modernization (`app/dashboard`)
*   **Sidebar & Navigation**:
    *   Replace static sidebar with a **Framer Motion collapsible sidebar**.
    *   Add "active state" floating indicators (pill shape moving behind the active link).
*   **Dashboard Stats (Overview)**:
    *   Replace standard Cards with **Aceternity Moving Border Cards** or **Gradient Border Cards**.
    *   Animate numerical values (count-up effect) using `framer-motion`'s `useSpring`.
*   **Data Visualization**:
    *   Wrap Recharts components in specific containers that animate entry (fade-in + slide-up).
*   **Tables & Lists**:
    *   Apply `AnimatePresence` to lists (Projects, Transactions) so items slide in/out when filtered or deleted.

### Phase 4: Component Integration
We will incrementally add these components to `components/ui/aceternity`:
*   `hero-parallax.tsx`
*   `bento-grid.tsx`
*   `moving-border.tsx`
*   `infinite-moving-cards.tsx`
*   `text-generate-effect.tsx` (for headlines)

## 5. Verification Plan

### Automated Build Check
1.  Run `npm run build` to ensure no type errors with new animations.
2.  Verify Tailwind configuration is valid.

### Manual UI Review (Browser Testing)
1.  **Landing Page**:
    *   Scroll from top to bottom. Verify Hero Parallax triggers smoothly.
    *   Hover over Bento Grid items. Verify interaction.
    *   Check responsiveness on Mobile (animations should be simplified or disabled if too heavy).
2.  **Dashboard**:
    *   Navigate between tabs. Verify layout transitions (active link indicator).
    *   Check "Moving Borders" on KPI cards.
    *   Refresh the page to see the "Count-up" animation on Revenue stats.
3.  **Performance**:
    *   Check console for GSAP/Framer warnings.
    *   Ensure no layout thrashing during animations.

## 6. Execution Order
1.  **Install & Config**: Set up the environment.
2.  **Landing Page**: Build the public face first (High impact).
3.  **Dashboard UI**: Refine the internal/admin experience.
