## MODIFIED Requirements

### Requirement: CSS color tokens

The design system SHALL expose all brand colors as CSS custom properties on `:root` in `src/app/globals.css`. The token set MUST include `--bg-base`, `--bg-panel`, `--bg-panel-hover`, `--bg-elevated`, `--val-red`, `--val-red-glow`, `--jett-blue`, `--viper-green`, `--omen-purple`, `--gold`, `--text-1`, `--text-2`, `--text-3`, `--border-dim`, `--border-med`, and `--border-bright`, each set to the exact hex/rgba values defined in the project spec. `--text-3` MUST be `rgba(234, 234, 240, 0.5)` (raised from a prior value of `0.3` to meet WCAG AA contrast requirements at the small font sizes it is used at throughout the site).

#### Scenario: Token is consumable from Tailwind utility

- **WHEN** a component uses `bg-[var(--val-red)]` or a `@theme`-mapped utility such as `bg-val-red`
- **THEN** the rendered element SHALL have background color `#FF4655`

#### Scenario: `--text-3` meets contrast on `--bg-base`

- **WHEN** `--text-3` is rendered as text color on `--bg-base`
- **THEN** the contrast ratio SHALL be at least 4.5:1
