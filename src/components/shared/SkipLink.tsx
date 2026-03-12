/**
 * Accessibility skip link for keyboard navigation.
 *
 * Rendered off-screen by default; becomes visible on `:focus` so keyboard
 * users can jump straight past navigation to the main content area.
 *
 * Requires a `<main id="main-content">` target element in the page.
 * CSS lives in `src/styles/globals.css`.
 */
export function SkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      Skip to main content
    </a>
  );
}
