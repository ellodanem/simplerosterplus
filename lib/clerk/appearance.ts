/** Clerk theme aligned with SR+ (emerald primary, zinc neutrals). */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#047857",
    colorDanger: "#dc2626",
    colorSuccess: "#047857",
    colorWarning: "#d97706",
    colorNeutral: "#71717a",
    colorText: "#18181b",
    colorTextSecondary: "#71717a",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#18181b",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    fontSize: "0.875rem",
  },
  elements: {
    card: {
      boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      border: "1px solid #e4e4e7",
    },
    formButtonPrimary: {
      backgroundColor: "#047857",
      "&:hover, &:focus, &:active": {
        backgroundColor: "#065f46",
      },
    },
    footerActionLink: {
      color: "#065f46",
      "&:hover": {
        color: "#022c22",
      },
    },
    socialButtonsBlockButton: {
      border: "1px solid #d4d4d8",
      "&:hover": {
        backgroundColor: "#fafafa",
      },
    },
    formFieldInput: {
      "&:focus": {
        borderColor: "#10b981",
        boxShadow: "0 0 0 2px rgb(16 185 129 / 0.25)",
      },
    },
  },
};
