import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./atoms/Text";
import { COLORS } from "../lib/constants";
import { AlertTriangle, RotateCcw, MessageCircle } from "lucide-react-native";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console (replace with Sentry or similar in production)
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReport = () => {
    const { error } = this.state;
    console.log("[ErrorBoundary] User reported issue:", {
      message: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    });
    // In production, send to error reporting service
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View className="flex-1 bg-white items-center justify-center px-8">
          {/* Icon */}
          <View className="w-20 h-20 rounded-full bg-red-50 items-center justify-center mb-6">
            <AlertTriangle size={36} color={COLORS.destructive} />
          </View>

          {/* Message */}
          <Text variant="title" weight="bold" className="text-center mb-2">
            Oops! Something went wrong
          </Text>
          <Text
            variant="body"
            className="text-center text-[#64748B] mb-8 leading-6"
          >
            An unexpected error occurred. Please try again or report the issue
            if it persists.
          </Text>

          {/* Error detail (dev only) */}
          {__DEV__ && this.state.error && (
            <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 w-full">
              <Text variant="caption" weight="medium" className="text-red-700">
                {this.state.error.message}
              </Text>
            </View>
          )}

          {/* Actions */}
          <Pressable
            onPress={this.handleReset}
            className="flex-row items-center justify-center bg-gold rounded-xl px-6 py-4 w-full mb-3"
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <RotateCcw size={18} color={COLORS.primary} />
            <Text variant="body" weight="semibold" className="ml-2">
              Try Again
            </Text>
          </Pressable>

          <Pressable
            onPress={this.handleReport}
            className="flex-row items-center justify-center border border-border rounded-xl px-6 py-4 w-full"
            accessibilityRole="button"
            accessibilityLabel="Report issue"
          >
            <MessageCircle size={18} color={COLORS.mutedForeground} />
            <Text
              variant="body"
              weight="medium"
              className="ml-2 text-[#64748B]"
            >
              Report Issue
            </Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
