export const componentTokens = {
  avatar: {
    sm: {
      size: 32,
      radius: 9999,
    },
    md: {
      size: 40,
      radius: 9999,
    },
    lg: {
      size: 48,
      radius: 9999,
    },
    placeholder: {
      background: {
        light: "#F5F5F3",
        dark: "#201E1C",
      },
      text: {
        light: "#52524D",
        dark: "#B8B0A8",
      },
    },
  },
  badge: {
    default: {
      background: {
        light: "#C44536",
        dark: "#FF9090",
      },
      text: {
        light: "#FFFFFF",
        dark: "#191613",
      },
      radius: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      fontSize: 10,
      fontWeight: 600,
    },
    outline: {
      background: "transparent",
      text: {
        light: "#C44536",
        dark: "#FF9090",
      },
      border: {
        light: "#C44536",
        dark: "#FF9090",
      },
      radius: 4,
    },
    success: {
      background: {
        light: "#E8F3EE",
        dark: "#1A2D22",
      },
      text: {
        light: "#5B8A72",
        dark: "#6B9A82",
      },
    },
    warning: {
      background: {
        light: "#FDF5E6",
        dark: "#2D2418",
      },
      text: {
        light: "#D9A441",
        dark: "#E8B451",
      },
    },
    error: {
      background: {
        light: "#FDECEA",
        dark: "#2D1818",
      },
      text: {
        light: "#DC3545",
        dark: "#D45546",
      },
    },
  },
  bottomSheet: {
    background: {
      light: "#FFFFFF",
      dark: "#161412",
    },
    radius: 16,
    handleColor: {
      light: "rgba(0, 0, 0, 0.1)",
      dark: "rgba(255, 255, 255, 0.1)",
    },
    shadow: {
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
    contentPadding: 20,
  },
  button: {
    primary: {
      background: {
        light: "#C44536",
        dark: "#FF9090",
      },
      text: {
        light: "#FFFFFF",
        dark: "#191613",
      },
      border: "transparent",
      radius: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontFamily: {
        ios: "System",
        android: "sans-serif",
        web: "'Plus Jakarta Sans', 'Noto Sans SC', sans-serif",
      },
      fontSize: 16,
      fontWeight: 600,
    },
    secondary: {
      background: "transparent",
      text: {
        light: "#C44536",
        dark: "#FF9090",
      },
      border: {
        light: "#C44536",
        dark: "#FF9090",
      },
      radius: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    ghost: {
      background: "transparent",
      text: {
        light: "#C44536",
        dark: "#FF9090",
      },
      border: "transparent",
      radius: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    disabled: {
      background: {
        light: "#D4D4D0",
        dark: "#3D3D39",
      },
      text: {
        light: "#73736D",
        dark: "#9B958E",
      },
      border: "transparent",
    },
  },
  card: {
    default: {
      background: {
        light: "#FFFFFF",
        dark: "#1F1B18",
      },
      border: {
        light: "rgba(0, 0, 0, 0.06)",
        dark: "rgba(255, 255, 255, 0.06)",
      },
      radius: 16,
      padding: 16,
      gap: 12,
      shadow: {
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
    },
    elevated: {
      background: {
        light: "#FFFFFF",
        dark: "#1F1B18",
      },
      border: "transparent",
      radius: 16,
      padding: 16,
      shadow: {
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
    },
  },
  input: {
    default: {
      background: {
        light: "#FAFAF8",
        dark: "#201E1C",
      },
      border: {
        light: "rgba(0, 0, 0, 0.1)",
        dark: "rgba(255, 255, 255, 0.1)",
      },
      radius: 6,
      paddingHorizontal: 16,
      paddingVertical: 12,
      text: {
        light: "#1A1A18",
        dark: "#F5F2ED",
      },
      placeholder: {
        light: "#73736D",
        dark: "#9B958E",
      },
      fontFamily: {
        ios: "System",
        android: "sans-serif",
        web: "'Plus Jakarta Sans', 'Noto Sans SC', sans-serif",
      },
      fontSize: 16,
      fontWeight: 400,
    },
    focused: {
      border: {
        light: "#C44536",
        dark: "#FF9090",
      },
    },
    error: {
      border: {
        light: "#DC3545",
        dark: "#D45546",
      },
    },
    disabled: {
      background: {
        light: "#F5F5F3",
        dark: "#201E1C",
      },
      text: {
        light: "#73736D",
        dark: "#9B958E",
      },
    },
  },
  toast: {
    success: {
      background: {
        light: "#E8F3EE",
        dark: "#1A2D22",
      },
      text: {
        light: "#5B8A72",
        dark: "#6B9A82",
      },
      icon: {
        light: "#5B8A72",
        dark: "#6B9A82",
      },
      radius: 10,
    },
    error: {
      background: {
        light: "#FDECEA",
        dark: "#2D1818",
      },
      text: {
        light: "#DC3545",
        dark: "#D45546",
      },
      icon: {
        light: "#DC3545",
        dark: "#D45546",
      },
      radius: 10,
    },
    warning: {
      background: {
        light: "#FDF5E6",
        dark: "#2D2418",
      },
      text: {
        light: "#D9A441",
        dark: "#E8B451",
      },
      icon: {
        light: "#D9A441",
        dark: "#E8B451",
      },
      radius: 10,
    },
    info: {
      background: {
        light: "#EEF1F4",
        dark: "#1A1D22",
      },
      text: {
        light: "#7B8FA2",
        dark: "#96A6B5",
      },
      icon: {
        light: "#7B8FA2",
        dark: "#96A6B5",
      },
      radius: 10,
    },
  },
} as const;

export type ComponentTokensType = typeof componentTokens;
