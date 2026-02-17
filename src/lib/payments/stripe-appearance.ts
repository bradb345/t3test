import type { Appearance } from "@stripe/stripe-js";

/** Build a Stripe Appearance object that matches the app's theme. */
export function getStripeAppearance(isDark: boolean): Appearance {
  if (typeof document === "undefined") {
    return { theme: isDark ? "night" : "stripe" };
  }

  const style = getComputedStyle(document.documentElement);
  const cssVar = (name: string) => style.getPropertyValue(name).trim();

  const radius = cssVar("--radius") || "0.5rem";

  return {
    theme: isDark ? "night" : "stripe",
    variables: {
      colorPrimary: `hsl(${cssVar("--primary")})`,
      colorBackground: `hsl(${cssVar("--card")})`,
      colorText: `hsl(${cssVar("--card-foreground")})`,
      colorDanger: `hsl(${cssVar("--destructive")})`,
      borderRadius: radius,
      fontFamily: "inherit",
    },
    rules: {
      ".Input": {
        border: `1px solid hsl(${cssVar("--input")})`,
        boxShadow: "none",
      },
      ".Input:focus": {
        border: `1px solid hsl(${cssVar("--ring")})`,
        boxShadow: `0 0 0 1px hsl(${cssVar("--ring")})`,
      },
      ".Label": {
        color: `hsl(${cssVar("--muted-foreground")})`,
      },
    },
  };
}
