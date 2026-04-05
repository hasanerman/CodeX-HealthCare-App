# Design System Strategy: Clinical Ether

## 1. Overview & Creative North Star: "The Clinical Ether"
This design system moves away from the "cluttered dashboard" trope and toward **The Clinical Ether**. This vision defines the UI not as a tool, but as a high-end medical environment: sterile but warm, technologically advanced but human-centric. 

The aesthetic is driven by **Asymmetric Calm**. By utilizing generous white space and off-center layouts, we move away from "boxed-in" templates. We use intentional layering—where data "floats" within glass containers—to signify the AI's role in lifting insights out of raw data. This is an editorial approach to healthcare, treating patient data with the same prestige as a luxury magazine spread.

---

## 2. Colors: Tonal Precision
Our palette is rooted in medical authority. Avoid "loud" saturation; instead, use depth and translucency to guide the eye.

### The "No-Line" Rule
**Explicit Instruction:** Designers are strictly prohibited from using 1px solid borders to section content. Boundaries must be defined through background color shifts.
*   *Implementation:* A `surface_container_low` card sits on a `surface` background. The contrast is felt, not seen as a line.

### Surface Hierarchy & Nesting
Treat the dashboard as a physical stack of frosted glass sheets.
*   **Base:** `background` (#f7f9fb).
*   **Structural Sections:** `surface_container_low`.
*   **Active Cards:** `surface_container_lowest` (#ffffff).
*   **Interactive Elements:** `surface_bright` to create a "lifted" feel.

### The "Glass & Gradient" Rule
To elevate the "AI" aspect, main CTAs and hero data points should utilize **Signature Textures**. 
*   **Primary CTA:** A linear gradient from `primary` (#006591) to `primary_container` (#0ea5e9) at a 135-degree angle.
*   **Glassmorphism:** Use `surface_container_lowest` at 60% opacity with a `20px` backdrop-blur for floating overlays or navigation sidebars.

---

## 3. Typography: The Editorial Authority
We pair the technical precision of **Inter** with the approachable sophistication of **Manrope**.

*   **Display & Headlines (Manrope):** These are our "Voice." Large, airy, and bold. Use `display-lg` for key metrics (e.g., Heart Rate) to give them an authoritative presence. 
*   **Body & Labels (Inter):** These are our "Data." Inter’s high x-height ensures readability in dense medical logs. Use `body-md` for patient notes to maintain a professional, clinical feel.
*   **Hierarchy Note:** Use `on_surface_variant` (#3e4850) for secondary labels to create a soft contrast against the `on_surface` (#191c1e) primary text.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are too "heavy" for a medical-grade UI. We use **Atmospheric Depth**.

*   **The Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` background. This creates a "Natural Lift" without adding visual noise.
*   **Ambient Shadows:** For "Floating" elements (modals/popovers), use a shadow with a blur of `40px` and an opacity of `6%`. Use a tint of `primary` (#006591) in the shadow color to simulate light passing through medical glass.
*   **The "Ghost Border" Fallback:** If a divider is functionally required, use `outline_variant` at **10% opacity**. It should be barely perceptible.
*   **Glassmorphism:** Navigation rails should use `surface_container_lowest` at 70% opacity with a `blur(12px)`. This allows the background healthcare trends to "bleed" through, softening the interface.

---

## 5. Components: Softness & Sophistication

### Buttons
*   **Primary:** Gradient (Primary to Primary Container), `xl` (3rem) corner radius. No border.
*   **Secondary:** `surface_container_high` background with `on_surface` text.
*   **Tertiary:** Ghost style, using `primary` text. Only a subtle `surface_variant` background on hover.

### Cards & Lists
*   **Rule:** Forbid divider lines. 
*   **Separation:** Use a `24px` vertical gap (Spacing Scale) or shift the card background from `surface_container_lowest` to `surface_container_low`.
*   **Corners:** All data cards must use the `lg` (2rem/32px) or `xl` (3rem/48px) corner radius to remove "sharpness" and instill a sense of safety.

### AI Insight Chips
*   **Style:** Semi-transparent `tertiary_container` (#00b17b) with a `4px` backdrop-blur. Use `on_tertiary_container` for the text to signify a "Healthy" AI-generated insight.

### Input Fields
*   **Base:** `surface_container_highest`. 
*   **Active State:** Smooth transition to a `ghost border` (outline-variant at 20%) and a subtle glow using `primary_fixed_dim`.

---

## 6. Do’s and Don’ts

### Do
*   **Do** embrace asymmetry. Let a large metric sit off-center to create a modern, editorial feel.
*   **Do** use the `32px+` corner radius religiously. Roundedness is a proxy for "Approachable Healthcare."
*   **Do** use `tertiary` (#006c49) for all "Positive" health indicators to evoke growth and stability.

### Don't
*   **Don't** use pure black (#000000). Use `on_background` (#191c1e) for text to keep the UI from feeling "heavy."
*   **Don't** use 1px solid borders. If the sections look muddy, increase the contrast between `surface_container` levels instead of adding a line.
*   **Don't** cram data. If a screen feels full, use a "Glass" drawer to hide secondary information.