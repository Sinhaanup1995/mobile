import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ApiError, apiFetch } from "../../../src/lib/api";
import { colors, radius } from "../../../src/lib/theme";

type InterestLevel = "HOT" | "WARM" | "COLD" | null;
type Customer = {
  id: string;
  profileId: string;
  name: string;
  mobile: string;
  city: string | null;
  interestLevel: InterestLevel;
};
type RelationshipManager = { id: string; name: string; phone: string };
type ProjectOption = {
  id: string;
  name: string;
  city: string;
  developer: { name: string };
  relationshipManagers: RelationshipManager[];
};

type Step = "customer" | "project" | "rm" | "location" | "photo" | "otp" | "rmOtp" | "review";

const INTEREST_OPTIONS: { value: Exclude<InterestLevel, null>; label: string; color: string }[] = [
  { value: "HOT", label: "Hot", color: colors.red },
  { value: "WARM", label: "Warm", color: colors.amber },
  { value: "COLD", label: "Cold", color: colors.blue },
];

export default function NewVisitScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("customer");

  // Customer
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [newName, setNewName] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [interestLevel, setInterestLevel] = useState<Exclude<InterestLevel, null> | null>(null);

  // Project
  const [projectQuery, setProjectQuery] = useState("");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [project, setProject] = useState<ProjectOption | null>(null);

  // Relationship manager
  const [rm, setRm] = useState<RelationshipManager | null>(null);
  const [rmChallengeId, setRmChallengeId] = useState<string | null>(null);
  const [rmOtpCode, setRmOtpCode] = useState("");
  const [rmDevCode, setRmDevCode] = useState<string | null>(null);
  const [rmOtpVerified, setRmOtpVerified] = useState(false);

  // Location + photo
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number | null } | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Customer OTP
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [otpVerified, setOtpVerified] = useState(false);

  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetAll = useCallback(() => {
    setStep("customer");
    setQuery("");
    setResults([]);
    setSearching(false);
    setCustomer(null);
    setNewName("");
    setNewMobile("");
    setInterestLevel(null);
    setProjectQuery("");
    setProjects([]);
    setProject(null);
    setRm(null);
    setRmChallengeId(null);
    setRmOtpCode("");
    setRmDevCode(null);
    setRmOtpVerified(false);
    setCoords(null);
    setPhotoUri(null);
    setChallengeId(null);
    setOtpCode("");
    setDevCode(null);
    setOtpVerified(false);
    setRemarks("");
    setError(null);
    setBusy(false);
  }, []);

  // Screens registered as tabs stay mounted, so state must be reset explicitly on every visit.
  useFocusEffect(
    useCallback(() => {
      resetAll();
    }, [resetAll]),
  );

  const searchCustomers = useCallback(async (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const result = await apiFetch<{ customers: Customer[] }>(`/customers?q=${encodeURIComponent(text)}`);
      setResults(result.customers);
    } catch {
      // Silent — the user can still create a new customer below.
    } finally {
      setSearching(false);
    }
  }, []);

  async function loadProjects(text = "") {
    setLoadingProjects(true);
    try {
      const result = await apiFetch<{ projects: ProjectOption[] }>(
        `/projects${text ? `?q=${encodeURIComponent(text)}` : ""}`,
      );
      setProjects(result.projects);
    } catch {
      setError("Could not load projects.");
    } finally {
      setLoadingProjects(false);
    }
  }

  function searchProjects(text: string) {
    setProjectQuery(text);
    loadProjects(text);
  }

  async function createCustomerAndContinue() {
    setError(null);
    if (newName.trim().length < 2 || newMobile.replace(/\D/g, "").length !== 10) {
      setError("Enter the customer's name and a valid 10-digit mobile number.");
      return;
    }
    setBusy(true);
    try {
      const result = await apiFetch<{ customer: Customer }>("/customers", {
        method: "POST",
        body: { name: newName, mobile: newMobile, interestLevel },
      });
      setCustomer(result.customer);
      setStep("project");
      loadProjects();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the customer.");
    } finally {
      setBusy(false);
    }
  }

  function chooseCustomer(selected: Customer) {
    setCustomer(selected);
    setInterestLevel(selected.interestLevel);
    setStep("project");
    loadProjects();
  }

  async function updateInterest(level: Exclude<InterestLevel, null>) {
    const next = interestLevel === level ? null : level;
    setInterestLevel(next);
    if (!customer) return;
    try {
      await apiFetch(`/customers/${customer.id}`, { method: "PATCH", body: { interestLevel: next } });
      setCustomer((current) => (current ? { ...current, interestLevel: next } : current));
    } catch {
      setInterestLevel(customer.interestLevel);
      setError("Could not update the lead temperature.");
    }
  }

  function chooseProject(selected: ProjectOption) {
    setProject(selected);
    if (selected.relationshipManagers.length > 0) {
      setStep("rm");
    } else {
      setRm(null);
      setStep("location");
    }
  }

  async function requestRmOtp(selected: RelationshipManager) {
    setError(null);
    setRm(selected);
    setBusy(true);
    try {
      const result = await apiFetch<{ challengeId: string; devCode?: string }>("/otp/request", {
        method: "POST",
        body: { mobile: selected.phone, purpose: "VISIT_RM" },
      });
      setRmChallengeId(result.challengeId);
      setRmDevCode(result.devCode ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the RM's OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyRmOtp() {
    if (!rmChallengeId) return;
    setError(null);
    setBusy(true);
    try {
      await apiFetch("/otp/verify", { method: "POST", body: { challengeId: rmChallengeId, code: rmOtpCode } });
      setRmOtpVerified(true);
      setStep("location");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Incorrect code.");
    } finally {
      setBusy(false);
    }
  }

  async function captureLocation() {
    setError(null);
    setBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission is required to log a visit.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
      setStep("photo");
    } catch {
      setError("Could not get your location. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function takePhoto() {
    if (!cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6, base64: false });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
      }
    } catch {
      setError("Could not capture the photo.");
    } finally {
      setBusy(false);
    }
  }

  async function requestOtp() {
    if (!customer) return;
    setError(null);
    setBusy(true);
    try {
      const result = await apiFetch<{ challengeId: string; devCode?: string }>("/otp/request", {
        method: "POST",
        body: { mobile: customer.mobile, purpose: "VISIT_CUSTOMER" },
      });
      setChallengeId(result.challengeId);
      setDevCode(result.devCode ?? null);
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (!challengeId) return;
    setError(null);
    setBusy(true);
    try {
      await apiFetch("/otp/verify", { method: "POST", body: { challengeId, code: otpCode } });
      setOtpVerified(true);
      goToRmOrReview();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Incorrect code.");
    } finally {
      setBusy(false);
    }
  }

  function skipCustomerOtp() {
    setError(null);
    goToRmOrReview();
  }

  function goToRmOrReview() {
    if (rm) {
      setStep("rmOtp");
      if (!rmChallengeId) requestRmOtp(rm);
    } else {
      setStep("review");
    }
  }

  function skipRmOtp() {
    setError(null);
    setStep("review");
  }

  async function submitVisit() {
    if (!customer || !project || !coords || !photoUri) return;
    setError(null);
    setBusy(true);
    try {
      const fileResponse = await fetch(photoUri);
      const blob = await fileResponse.blob();
      const contentType = blob.type || "image/jpeg";
      const fileName = `visit-${Date.now()}.${contentType.includes("png") ? "png" : "jpg"}`;

      const signed = await apiFetch<{ key: string; uploadUrl: string }>("/uploads/sign", {
        method: "POST",
        body: { fileName, contentType },
      });

      await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: blob });

      await apiFetch("/visits", {
        method: "POST",
        body: {
          customerId: customer.id,
          projectId: project.id,
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy ?? undefined,
          photoKey: signed.key,
          remarks: remarks || undefined,
          customerOtpChallengeId: otpVerified ? challengeId ?? undefined : undefined,
          rmId: rm?.id,
          rmOtpChallengeId: rm && rmOtpVerified ? rmChallengeId ?? undefined : undefined,
        },
      });

      resetAll();
      router.replace("/(app)");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit the visit. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>New site visit</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {step === "customer" ? (
        <View>
          <Text style={styles.label}>Search an existing customer</Text>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={searchCustomers}
            placeholder="Name, mobile or profile ID"
            placeholderTextColor={colors.muted}
          />
          {searching ? <ActivityIndicator style={{ marginTop: 10 }} /> : null}
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card} onPress={() => chooseCustomer(item)}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {item.profileId} · {item.mobile}
                </Text>
              </TouchableOpacity>
            )}
          />

          <Text style={[styles.label, { marginTop: 20 }]}>Lead temperature</Text>
          <Text style={styles.helpText}>Mark the customer&apos;s current interest for follow-up.</Text>
          <View style={styles.interestRow}>
            {INTEREST_OPTIONS.map((option) => {
              const active = interestLevel === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.interestChip, { borderColor: option.color }, active && { backgroundColor: option.color }]}
                  onPress={() => updateInterest(option.value)}
                >
                  <Text style={[styles.interestChipText, { color: active ? colors.white : option.color }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 20 }]}>Or add a new customer</Text>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="Customer's full name"
            placeholderTextColor={colors.muted}
          />
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={newMobile}
            onChangeText={setNewMobile}
            placeholder="10-digit mobile number"
            placeholderTextColor={colors.muted}
            keyboardType="phone-pad"
          />
          <TouchableOpacity style={styles.button} onPress={createCustomerAndContinue} disabled={busy}>
            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Save & continue</Text>}
          </TouchableOpacity>
        </View>
      ) : null}

      {step === "project" ? (
        <View>
          <View style={styles.selectedCustomer}>
            <Text style={styles.cardTitle}>{customer?.name}</Text>
            <Text style={styles.cardSubtitle}>{customer?.profileId} · {customer?.mobile}</Text>
          </View>
          <Text style={styles.label}>Lead temperature</Text>
          <Text style={styles.helpText}>Mark the customer&apos;s current interest for follow-up.</Text>
          <View style={styles.interestRow}>
            {INTEREST_OPTIONS.map((option) => {
              const active = interestLevel === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.interestChip, { borderColor: option.color }, active && { backgroundColor: option.color }]}
                  onPress={() => updateInterest(option.value)}
                >
                  <Text style={[styles.interestChipText, { color: active ? colors.white : option.color }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.label}>Select the project</Text>
          <TextInput
            style={styles.input}
            value={projectQuery}
            onChangeText={searchProjects}
            placeholder="Search by project, city or developer"
            placeholderTextColor={colors.muted}
          />
          {loadingProjects ? <ActivityIndicator style={{ marginTop: 10 }} /> : null}
          <FlatList
            data={projects}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            style={{ marginTop: 10 }}
            ListEmptyComponent={
              !loadingProjects ? <Text style={styles.emptyText}>No listed projects match your search.</Text> : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card} onPress={() => chooseProject(item)}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {item.developer.name} · {item.city}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}

      {step === "rm" ? (
        <View>
          <Text style={styles.label}>Select the relationship manager on site</Text>
          <Text style={styles.helpText}>They&apos;ll need to enter an OTP sent to their registered mobile.</Text>
          <FlatList
            data={project?.relationshipManagers ?? []}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => {
                  requestRmOtp(item);
                  setStep("location");
                }}
                disabled={busy}
              >
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>{item.phone}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}

      {step === "location" ? (
        <View>
          <Text style={styles.label}>Confirm your location</Text>
          <Text style={styles.helpText}>We record your GPS position at check-in as proof of the visit.</Text>
          <TouchableOpacity style={styles.button} onPress={captureLocation} disabled={busy}>
            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Use current location</Text>}
          </TouchableOpacity>
        </View>
      ) : null}

      {step === "photo" ? (
        <View>
          <Text style={styles.label}>Take a site photo</Text>
          {!photoUri ? (
            !cameraPermission?.granted ? (
              <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
                <Text style={styles.buttonText}>Allow camera access</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <CameraView ref={cameraRef} style={styles.camera} facing="back" />
                <TouchableOpacity style={styles.button} onPress={takePhoto} disabled={busy}>
                  {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Capture photo</Text>}
                </TouchableOpacity>
              </View>
            )
          ) : (
            <View>
              <Image source={{ uri: photoUri }} style={styles.preview} />
              <TouchableOpacity style={styles.button} onPress={() => setPhotoUri(null)}>
                <Text style={styles.buttonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { marginTop: 10 }]} onPress={requestOtp} disabled={busy}>
                {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Continue to OTP</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : null}

      {step === "otp" ? (
        <View>
          <Text style={styles.label}>Verify the customer&apos;s OTP</Text>
          <Text style={styles.helpText}>
            A 6-digit code was sent to {customer?.mobile}.
            {devCode ? ` (Dev code: ${devCode})` : ""}
          </Text>
          <TextInput
            style={styles.input}
            value={otpCode}
            onChangeText={setOtpCode}
            placeholder="6-digit code"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity style={styles.button} onPress={verifyOtp} disabled={busy}>
            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Verify code</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton} onPress={skipCustomerOtp} disabled={busy}>
            <Text style={styles.linkButtonText}>Skip for now — verify later</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {step === "rmOtp" ? (
        <View>
          <Text style={styles.label}>Verify {rm?.name}&apos;s OTP</Text>
          <Text style={styles.helpText}>
            A 6-digit code was sent to {rm?.phone}.
            {rmDevCode ? ` (Dev code: ${rmDevCode})` : ""}
          </Text>
          <TextInput
            style={styles.input}
            value={rmOtpCode}
            onChangeText={setRmOtpCode}
            placeholder="6-digit code"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity style={styles.button} onPress={verifyRmOtp} disabled={busy}>
            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Verify code</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton} onPress={skipRmOtp} disabled={busy}>
            <Text style={styles.linkButtonText}>Skip for now — verify later</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {step === "review" ? (
        <View>
          <Text style={styles.label}>Review & submit</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{customer?.name}</Text>
            <Text style={styles.cardSubtitle}>{project?.name}</Text>
            <Text style={styles.cardSubtitle}>Customer OTP: {otpVerified ? "Verified" : "Not verified yet"}</Text>
            {rm ? (
              <Text style={styles.cardSubtitle}>
                RM: {rm.name} ({rmOtpVerified ? "verified" : "not verified"})
              </Text>
            ) : null}
          </View>
          {!otpVerified || (rm && !rmOtpVerified) ? (
            <Text style={styles.helpText}>
              You can verify any pending OTP later from the visit&apos;s details.
            </Text>
          ) : null}
          <TextInput
            style={[styles.input, styles.multiline]}
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Remarks (optional)"
            placeholderTextColor={colors.muted}
            multiline
          />
          <TouchableOpacity style={styles.button} onPress={submitVisit} disabled={busy}>
            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Submit visit</Text>}
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 60, paddingBottom: 60 },
  title: { color: colors.ink, fontFamily: "Manrope_700Bold", fontSize: 20, marginBottom: 16 },
  label: { color: colors.ink, fontFamily: "Manrope_600SemiBold", fontSize: 14, marginBottom: 8 },
  helpText: { color: colors.muted, fontFamily: "Manrope_400Regular", fontSize: 12, marginBottom: 12 },
  error: { color: colors.red, fontFamily: "Manrope_500Medium", fontSize: 13, marginBottom: 12 },
  emptyText: { color: colors.muted, fontFamily: "Manrope_400Regular", fontSize: 13, marginTop: 10 },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontFamily: "Manrope_400Regular",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiline: { minHeight: 80, textAlignVertical: "top", marginTop: 12 },
  button: {
    backgroundColor: colors.navy700,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
  },
  buttonText: { color: colors.white, fontFamily: "Manrope_600SemiBold", fontSize: 15 },
  linkButton: { alignItems: "center", paddingVertical: 12, marginTop: 4 },
  linkButtonText: { color: colors.blue, fontFamily: "Manrope_500Medium", fontSize: 13 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginTop: 10,
  },
  cardTitle: { color: colors.ink, fontFamily: "Manrope_600SemiBold", fontSize: 14 },
  cardSubtitle: { color: colors.muted, fontFamily: "Manrope_400Regular", fontSize: 12, marginTop: 2 },
  selectedCustomer: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 18,
  },
  interestRow: { flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 4 },
  interestChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  interestChipText: { fontFamily: "Manrope_600SemiBold", fontSize: 11 },
  camera: { height: 320, borderRadius: radius.md, overflow: "hidden", marginBottom: 4 },
  preview: { height: 320, borderRadius: radius.md, marginBottom: 4 },
});
