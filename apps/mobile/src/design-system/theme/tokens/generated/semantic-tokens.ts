export const semanticTokens = {
  colors: {
    surface: {
      primary: {
        light: "#FFFFFF",
        dark: "#1A1A18",
      },
      secondary: {
        light: "#FAFAF8",
        dark: "#161412",
      },
      tertiary: {
        light: "#F5F5F3",
        dark: "#201E1C",
      },
      elevated: {
        light: "#FFFFFF",
        dark: "#1F1B18",
      },
      overlay: {
        light: "rgba(0, 0, 0, 0.4)",
        dark: "rgba(0, 0, 0, 0.72)",
      },
    },
    text: {
      primary: {
        light: "#1A1A18",
        dark: "#F5F2ED",
      },
      secondary: {
        light: "#52524D",
        dark: "#B8B0A8",
      },
      tertiary: {
        light: "#73736D",
        dark: "#9B958E",
      },
      inverse: {
        light: "#FFFFFF",
        dark: "#191613",
      },
      brand: {
        light: "#9A5B3E",
        dark: "#D68B6C",
      },
      link: {
        light: "#7B8FA2",
        dark: "#96A6B5",
      },
    },
    interactive: {
      primary: {
        light: "#C44536",
        dark: "#FF9090",
      },
      secondary: {
        light: "#8B9A7D",
        dark: "#9AA88C",
      },
      hover: {
        light: "#E8715B",
        dark: "#FFA8A8",
      },
      pressed: {
        light: "#A83528",
        dark: "#FF7F7F",
      },
      disabled: {
        light: "#D4D4D0",
        dark: "#3D3D39",
      },
    },
    status: {
      success: {
        light: "#5B8A72",
        dark: "#6B9A82",
      },
      successLight: {
        light: "#E8F3EE",
        dark: "#1A2D22",
      },
      warning: {
        light: "#D9A441",
        dark: "#E8B451",
      },
      warningLight: {
        light: "#FDF5E6",
        dark: "#2D2418",
      },
      error: {
        light: "#DC3545",
        dark: "#D45546",
      },
      errorLight: {
        light: "#FDECEA",
        dark: "#2D1818",
      },
      info: {
        light: "#7B8FA2",
        dark: "#96A6B5",
      },
      infoLight: {
        light: "#EEF1F4",
        dark: "#1A1D22",
      },
    },
    border: {
      light: {
        light: "rgba(0, 0, 0, 0.06)",
        dark: "rgba(255, 255, 255, 0.06)",
      },
      default: {
        light: "rgba(0, 0, 0, 0.1)",
        dark: "rgba(255, 255, 255, 0.1)",
      },
      strong: {
        light: "rgba(0, 0, 0, 0.2)",
        dark: "rgba(255, 255, 255, 0.18)",
      },
      brand: {
        light: "#C44536",
        dark: "#D68B6C",
      },
    },
    background: {
      modal: {
        light: "#FFFFFF",
        dark: "#161412",
      },
      card: {
        light: "#FFFFFF",
        dark: "#1F1B18",
      },
      sheet: {
        light: "#FFFFFF",
        dark: "#161412",
      },
      input: {
        light: "#FAFAF8",
        dark: "#201E1C",
      },
    },
  },
  motion: {
    transition: {
      fast: {
        duration: 150,
        easing: [0, 0, 0.2, 1],
      },
      medium: {
        duration: 300,
        easing: [0, 0, 0.2, 1],
      },
      slow: {
        duration: 500,
        easing: [0.4, 0, 0.2, 1],
      },
    },
    entrance: {
      fadeIn: {
        duration: 300,
        easing: [0, 0, 0.2, 1],
      },
      slideUp: {
        duration: 300,
        easing: [0.22, 1, 0.36, 1],
      },
      scaleIn: {
        duration: 150,
        spring: {
          damping: 20,
          stiffness: 300,
          mass: 1,
        },
      },
    },
    exit: {
      fadeOut: {
        duration: 150,
        easing: [0.4, 0, 1, 1],
      },
      slideDown: {
        duration: 300,
        easing: [0.4, 0, 1, 1],
      },
      scaleOut: {
        duration: 150,
        easing: [0.4, 0, 1, 1],
      },
    },
    spring: {
      interactive: {
        spring: {
          damping: 20,
          stiffness: 300,
          mass: 1,
        },
      },
      navigation: {
        spring: {
          damping: 25,
          stiffness: 120,
          mass: 1,
        },
      },
      celebration: {
        spring: {
          damping: 12,
          stiffness: 180,
          mass: 1,
        },
      },
      alert: {
        spring: {
          damping: 30,
          stiffness: 400,
          mass: 1,
        },
      },
    },
  },
  radius: {
    button: {
      default: 10,
      pill: 9999,
    },
    card: {
      default: 16,
      flat: 4,
    },
    input: {
      default: 6,
    },
    avatar: {
      default: 9999,
    },
    badge: {
      default: 4,
      pill: 9999,
    },
    sheet: {
      default: 16,
    },
    modal: {
      default: 24,
    },
    toast: {
      default: 10,
    },
  },
  shadows: {
    card: {
      light: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      },
      dark: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      },
    },
    modal: {
      light: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 8,
        },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 8,
      },
      dark: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 8,
        },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 8,
      },
    },
    dropdown: {
      light: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
      },
      dark: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
      },
    },
    tooltip: {
      light: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
      },
      dark: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
      },
    },
    notification: {
      light: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 12,
        },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 12,
      },
      dark: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 12,
        },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 12,
      },
    },
  },
  spacing: {
    button: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    card: {
      padding: 16,
      gap: 12,
    },
    input: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    list: {
      gap: 12,
      sectionGap: 24,
    },
    screen: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 24,
    },
    avatar: {
      size: {
        sm: 32,
        md: 40,
        lg: 48,
      },
    },
    icon: {
      size: {
        sm: 16,
        md: 20,
        lg: 24,
      },
    },
  },
  typography: {
    heading: {
      h1: {
        fontFamily: {
          ios: "Georgia",
          android: "serif",
          web: "Georgia, 'Noto Serif SC', serif",
        },
        fontSize: 36,
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: -1,
      },
      h2: {
        fontFamily: {
          ios: "Georgia",
          android: "serif",
          web: "Georgia, 'Noto Serif SC', serif",
        },
        fontSize: 28,
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: -1,
      },
      h3: {
        fontFamily: {
          ios: "Georgia",
          android: "serif",
          web: "Georgia, 'Noto Serif SC', serif",
        },
        fontSize: 24,
        fontWeight: 600,
        lineHeight: 1.375,
      },
      h4: {
        fontFamily: {
          ios: "Georgia",
          android: "serif",
          web: "Georgia, 'Noto Serif SC', serif",
        },
        fontSize: 20,
        fontWeight: 600,
        lineHeight: 1.5,
      },
      h5: {
        fontFamily: {
          ios: "Georgia",
          android: "serif",
          web: "Georgia, 'Noto Serif SC', serif",
        },
        fontSize: 18,
        fontWeight: 600,
        lineHeight: 1.5,
      },
      h6: {
        fontFamily: {
          ios: "Georgia",
          android: "serif",
          web: "Georgia, 'Noto Serif SC', serif",
        },
        fontSize: 16,
        fontWeight: 600,
        lineHeight: 1.5,
      },
    },
    body: {
      large: {
        fontFamily: {
          ios: "System",
          android: "sans-serif",
          web: "'Plus Jakarta Sans', 'Noto Sans SC', sans-serif",
        },
        fontSize: 18,
        fontWeight: 400,
        lineHeight: 1.625,
      },
      default: {
        fontFamily: {
          ios: "System",
          android: "sans-serif",
          web: "'Plus Jakarta Sans', 'Noto Sans SC', sans-serif",
        },
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 1.625,
      },
      small: {
        fontFamily: {
          ios: "System",
          android: "sans-serif",
          web: "'Plus Jakarta Sans', 'Noto Sans SC', sans-serif",
        },
        fontSize: 14,
        fontWeight: 400,
        lineHeight: 1.625,
      },
    },
    caption: {
      fontFamily: {
        ios: "System",
        android: "sans-serif",
        web: "'Plus Jakarta Sans', 'Noto Sans SC', sans-serif",
      },
      fontSize: 12,
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: 0.5,
    },
    overline: {
      fontFamily: {
        ios: "System",
        android: "sans-serif",
        web: "'Plus Jakarta Sans', 'Noto Sans SC', sans-serif",
      },
      fontSize: 10,
      fontWeight: 700,
      lineHeight: 1.5,
      letterSpacing: 2,
    },
    label: {
      fontFamily: {
        ios: "System",
        android: "sans-serif",
        web: "'Plus Jakarta Sans', 'Noto Sans SC', sans-serif",
      },
      fontSize: 14,
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: 0.5,
    },
  },
} as const;

export type SemanticTokensType = typeof semanticTokens;
