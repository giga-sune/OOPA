import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useStripe } from "@stripe/stripe-react-native";

import { useAuth } from "../context/AuthContext";
import {
  createBillingPortalSession,
  createProSubscription,
  getSubscriptionPlans,
  subscribeToEntitlement,
} from "../services/stripe/subscriptionService";
import { Colors, Radius, Shadows, Spacing, Typography } from "../styles/globalDesignSystem";
import type { RootStackParamList } from "../types/navigation/navigationTypes";
import type {
  Entitlement,
  SubscriptionInterval,
  SubscriptionPlan,
} from "../types/subscription/subscriptionTypes";
import {
  calculateYearlySavings,
  formatSubscriptionPrice,
} from "../utils/subscriptionPricing";

type Props = NativeStackScreenProps<RootStackParamList, "Subscription">;

const INACTIVE_STATUSES = new Set(["canceled", "incomplete_expired"]);

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message.replace(/^\[functions\/[\w-]+\]\s*/, "");
  }

  return fallback;
}

function formatDate(date: Date | null): string {
  if (!date) return "Updating";

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function statusLabel(entitlement: Entitlement): string {
  if (entitlement.cancelAtPeriodEnd && entitlement.active) {
    return "Cancels at period end";
  }

  return entitlement.providerStatus
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function SubscriptionScreen({navigation, route}: Props) {
  const {user} = useAuth();
  const {initPaymentSheet, presentPaymentSheet} = useStripe();
  const origin = route.params?.origin ?? "profile";
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingEntitlement, setLoadingEntitlement] = useState(true);
  const [payingInterval, setPayingInterval] = useState<SubscriptionInterval | null>(null);
  const [awaitingActivation, setAwaitingActivation] = useState(false);
  const [activationDelayed, setActivationDelayed] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [error, setError] = useState("");

  const monthlyPlan = plans.find((plan) => plan.interval === "monthly");
  const yearlyPlan = plans.find((plan) => plan.interval === "yearly");
  const yearlySavings = useMemo(
    () => calculateYearlySavings(monthlyPlan, yearlyPlan),
    [monthlyPlan, yearlyPlan]
  );
  const hasManagedSubscription = !!entitlement &&
    !INACTIVE_STATUSES.has(entitlement.providerStatus);

  useEffect(() => {
    let active = true;

    getSubscriptionPlans()
      .then((nextPlans) => {
        if (active) setPlans(nextPlans);
      })
      .catch((planError) => {
        if (active) {
          setError(errorMessage(planError, "Unable to load subscription plans."));
        }
      })
      .finally(() => {
        if (active) setLoadingPlans(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setLoadingEntitlement(false);
      return;
    }

    return subscribeToEntitlement(
      user.uid,
      (nextEntitlement) => {
        setEntitlement(nextEntitlement);
        setLoadingEntitlement(false);
        if (nextEntitlement?.active) {
          setAwaitingActivation(false);
          setActivationDelayed(false);
          setError("");
        }
      },
      (listenerError) => {
        setLoadingEntitlement(false);
        setError(errorMessage(listenerError, "Unable to load your subscription status."));
      }
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!awaitingActivation || entitlement?.active) {
      setActivationDelayed(false);
      return;
    }

    const timer = setTimeout(() => setActivationDelayed(true), 15000);
    return () => clearTimeout(timer);
  }, [awaitingActivation, entitlement?.active]);

  const subscribe = async (interval: SubscriptionInterval) => {
    if (payingInterval || hasManagedSubscription) return;

    setError("");
    setPayingInterval(interval);

    try {
      const result = await createProSubscription(interval);
      const {error: initializationError} = await initPaymentSheet({
        merchantDisplayName: "OOPA",
        paymentIntentClientSecret: result.clientSecret,
        customerId: result.customerId,
        customerEphemeralKeySecret: result.customerEphemeralKeySecret,
        returnURL: "oopa://subscription",
      });

      if (initializationError) {
        throw new Error(initializationError.message);
      }

      const {error: paymentError} = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code !== "Canceled") {
          setError(paymentError.message);
        }
        return;
      }

      setAwaitingActivation(true);
    } catch (subscriptionError) {
      setError(errorMessage(subscriptionError, "Unable to start your subscription."));
    } finally {
      setPayingInterval(null);
    }
  };

  const manageBilling = async () => {
    if (openingPortal) return;

    setError("");
    setOpeningPortal(true);

    try {
      const url = await createBillingPortalSession();
      await Linking.openURL(url);
    } catch (portalError) {
      setError(errorMessage(portalError, "Unable to open billing management."));
    } finally {
      setOpeningPortal(false);
    }
  };

  const continuePosting = () => {
    navigation.navigate("MainApp", {screen: "Post"});
  };

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isYearly = plan.interval === "yearly";
    const isPaying = payingInterval === plan.interval;

    return (
      <View key={plan.interval} style={[styles.planCard, isYearly && styles.featuredCard]}>
        <View style={styles.planHeadingRow}>
          <View>
            <Text style={styles.planName}>{isYearly ? "Yearly" : "Monthly"}</Text>
            <Text style={styles.planPrice}>
              {formatSubscriptionPrice(plan)}
              <Text style={styles.planPeriod}> / {isYearly ? "year" : "month"}</Text>
            </Text>
          </View>
          {isYearly && yearlySavings ? (
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>BEST VALUE</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.benefitRow}>
          <Feather name="check-circle" size={20} color={Colors.success} />
          <Text style={styles.benefitText}>Unlimited active listings</Text>
        </View>

        {isYearly && yearlySavings ? (
          <Text style={styles.savingsText}>
            Save {yearlySavings.percent}% compared with monthly billing
          </Text>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, (payingInterval !== null) && styles.disabledButton]}
          disabled={payingInterval !== null}
          onPress={() => void subscribe(plan.interval)}
        >
          {isPaying ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>
              Subscribe {isYearly ? "yearly" : "monthly"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const isInitialLoading = loadingPlans || loadingEntitlement;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Subscription</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <View style={styles.heroIcon}>
        <Feather name="zap" size={30} color={Colors.primary} />
      </View>
      <Text style={styles.title}>OOPA Pro</Text>
      <Text style={styles.subtitle}>
        {origin === "postLimit"
          ? "Upgrade to keep sharing more items with your community."
          : "Choose a plan for unlimited active listings."}
      </Text>

      {error ? (
        <View style={styles.errorCard}>
          <Feather name="alert-circle" size={18} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {isInitialLoading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your plan...</Text>
        </View>
      ) : awaitingActivation && !entitlement?.active ? (
        <View style={styles.statusCard}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.statusTitle}>Activating your plan...</Text>
          <Text style={styles.statusDescription}>
            {activationDelayed
              ? "Stripe is taking longer than usual to confirm access. You will not be charged again."
              : "Payment was completed. This screen will update as soon as Stripe confirms your access."}
          </Text>
          {activationDelayed ? (
            <TouchableOpacity
              style={[styles.secondaryButton, openingPortal && styles.disabledButton]}
              disabled={openingPortal}
              onPress={() => void manageBilling()}
            >
              {openingPortal ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.secondaryButtonText}>Manage billing</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      ) : hasManagedSubscription && entitlement ? (
        <View style={styles.statusCard}>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>{statusLabel(entitlement)}</Text>
          </View>
          <Text style={styles.currentPlanLabel}>CURRENT PLAN</Text>
          <Text style={styles.currentPlanName}>
            OOPA Pro {entitlement.interval === "yearly" ? "Yearly" : "Monthly"}
          </Text>
          <View style={styles.benefitRow}>
            <Feather name="check-circle" size={20} color={Colors.success} />
            <Text style={styles.benefitText}>Unlimited active listings</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {entitlement.cancelAtPeriodEnd ? "Access until" : "Renews"}
            </Text>
            <Text style={styles.detailValue}>{formatDate(entitlement.currentPeriodEnd)}</Text>
          </View>

          {origin === "postLimit" && entitlement.active ? (
            <TouchableOpacity style={styles.primaryButton} onPress={continuePosting}>
              <Text style={styles.primaryButtonText}>Continue posting</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.secondaryButton, openingPortal && styles.disabledButton]}
            disabled={openingPortal}
            onPress={() => void manageBilling()}
          >
            {openingPortal ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.secondaryButtonText}>Manage billing</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : plans.length > 0 ? (
        <View>
          <View style={styles.freePlanCard}>
            <View>
              <Text style={styles.currentPlanLabel}>CURRENT PLAN</Text>
              <Text style={styles.freePlanName}>Free</Text>
            </View>
            <Text style={styles.freePlanLimit}>Up to 3 active listings</Text>
          </View>
          <View style={styles.planList}>{plans.map(renderPlanCard)}</View>
        </View>
      ) : (
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.replace("Subscription", route.params)}>
          <Text style={styles.secondaryButtonText}>Try again</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.finePrint}>
        Subscriptions renew automatically until cancelled. Manage or cancel anytime through Stripe billing.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.white},
  content: {padding: Spacing.lg, paddingBottom: 80},
  topBar: {flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.xl},
  backButton: {width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.menu, alignItems: "center", justifyContent: "center"},
  topBarTitle: {...Typography.h3, color: Colors.text},
  topBarSpacer: {width: 44},
  heroIcon: {width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primaryTertiary, alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: Spacing.md},
  title: {...Typography.h1, color: Colors.text, textAlign: "center"},
  subtitle: {...Typography.body, color: Colors.subText, textAlign: "center", marginTop: Spacing.sm, marginBottom: Spacing.xl},
  planList: {gap: Spacing.md},
  freePlanCard: {flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.menu, padding: Spacing.md, marginBottom: Spacing.md},
  freePlanName: {...Typography.h3, color: Colors.text, marginTop: 2},
  freePlanLimit: {...Typography.bodySmall, color: Colors.subText, textAlign: "right", flex: 1},
  planCard: {borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: Spacing.lg, backgroundColor: Colors.white},
  featuredCard: {borderColor: Colors.primary, borderWidth: 2, backgroundColor: "#FFFBF7", ...Shadows.lightDrop},
  planHeadingRow: {flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: Spacing.sm},
  planName: {...Typography.h3, color: Colors.text},
  planPrice: {...Typography.h2, color: Colors.text, marginTop: Spacing.xs},
  planPeriod: {...Typography.bodySmall, color: Colors.subText},
  bestValueBadge: {backgroundColor: Colors.primary, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 6},
  bestValueText: {...Typography.caption, color: Colors.white, fontWeight: "700"},
  benefitRow: {flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginTop: Spacing.lg},
  benefitText: {...Typography.body, color: Colors.text, flex: 1},
  savingsText: {...Typography.bodySmall, color: Colors.success, fontWeight: "600", marginTop: Spacing.md},
  primaryButton: {minHeight: 54, borderRadius: Radius.pill, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", marginTop: Spacing.lg, paddingHorizontal: Spacing.md, ...Shadows.primary},
  primaryButtonText: {...Typography.button, color: Colors.white},
  secondaryButton: {minHeight: 54, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.primary, alignItems: "center", justifyContent: "center", marginTop: Spacing.md, paddingHorizontal: Spacing.md},
  secondaryButtonText: {...Typography.button, color: Colors.primary},
  disabledButton: {opacity: 0.6},
  loadingCard: {minHeight: 160, borderRadius: Radius.lg, backgroundColor: Colors.menu, alignItems: "center", justifyContent: "center", gap: Spacing.md},
  loadingText: {...Typography.bodySmall, color: Colors.subText},
  errorCard: {flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm, backgroundColor: "#FEF2F2", padding: Spacing.md, borderRadius: Radius.md, marginBottom: Spacing.md},
  errorText: {...Typography.bodySmall, color: Colors.error, flex: 1},
  statusCard: {borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: Spacing.lg, backgroundColor: Colors.white, alignItems: "stretch", ...Shadows.lightDrop},
  statusTitle: {...Typography.h3, color: Colors.text, textAlign: "center", marginTop: Spacing.md},
  statusDescription: {...Typography.bodySmall, color: Colors.subText, textAlign: "center", marginTop: Spacing.sm},
  activeBadge: {alignSelf: "flex-start", borderRadius: Radius.pill, backgroundColor: "#DCFCE7", paddingHorizontal: 12, paddingVertical: 6},
  activeBadgeText: {...Typography.caption, color: "#15803D", fontWeight: "700"},
  currentPlanLabel: {...Typography.caption, color: Colors.subText, fontWeight: "700", marginTop: Spacing.lg},
  currentPlanName: {...Typography.h2, color: Colors.text, marginTop: Spacing.xs},
  detailRow: {flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, marginTop: Spacing.lg, paddingTop: Spacing.md},
  detailLabel: {...Typography.bodySmall, color: Colors.subText},
  detailValue: {...Typography.bodySmall, color: Colors.text, fontWeight: "600", textAlign: "right"},
  finePrint: {...Typography.caption, color: Colors.subText, textAlign: "center", marginTop: Spacing.xl, paddingHorizontal: Spacing.md},
});
