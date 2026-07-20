import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getAuth } from "firebase/auth";
import { subscribeToUserChats, markChatAsRead, type ChatChannel } from "../services/chat/chatService";
import type { RootStackParamList, TabParamList } from "../types/navigation/navigationTypes";

// Composes the internal Tab navigation behavior together with the Root Stack structure
type InboxScreenNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, "Inbox">,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function InboxScreen() {
  const [chats, setChats] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<InboxScreenNavProp>();
  
  const auth = getAuth();
  const currentUserUid = auth.currentUser?.uid;

  useEffect(() => {
    if (!currentUserUid) return;

    // Stream user chats in real-time
    const unsubscribe = subscribeToUserChats(currentUserUid, (updatedChats) => {
      setChats(updatedChats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserUid]);

  const handleChatPress = async (chat: ChatChannel) => {
    if (!currentUserUid) return;

    // Mark as read locally/remotely
    await markChatAsRead(chat.id, currentUserUid);

    // Determine other participant details
    const isOwner = chat.ownerUid === currentUserUid;
    const recipientUid = isOwner ? chat.renterUid : chat.ownerUid;
    const recipientName = isOwner ? chat.renterDisplayName : chat.ownerDisplayName;

    // This now resolves safely because ChatRoom belongs to the parent RootStackParamList
    navigation.navigate("ChatRoom", {
      rentalId: chat.id,
      title: chat.propertyTitle,
      recipientUid,
      recipientName,
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {chats.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No active chats yet.</Text>
          <Text style={styles.emptySubtitle}>Chats appear once a rental request is approved.</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isOwner = item.ownerUid === currentUserUid;
            const targetName = (isOwner ? item.renterDisplayName : item.ownerDisplayName) || "User";
            const isUnread = item.unreadBy?.includes(currentUserUid || "");

            return (
              <TouchableOpacity style={styles.chatRow} onPress={() => handleChatPress(item)}>
                {item.propertyImageUrl ? (
                  <Image source={{ uri: item.propertyImageUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.placeholderAvatar]}>
                    <Text style={styles.placeholderText}>{targetName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}

                <View style={styles.chatInfo}>
                  <View style={styles.row}>
                    <Text style={styles.nameText}>{targetName}</Text>
                    {isUnread && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.propertyTitle}
                  </Text>
                  <Text style={[styles.lastMessage, isUnread && styles.unreadMessage]} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  header: { paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderColor: "#F0F0F0" },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#1A1A1A" },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#666", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: "#999", textAlign: "center" },
  chatRow: { flexDirection: "row", padding: 15, borderBottomWidth: 1, borderColor: "#F9F9F9", alignItems: "center" },
  avatar: { width: 55, height: 55, borderRadius: 12, backgroundColor: "#F0F0F0" },
  placeholderAvatar: { justifyContent: "center", alignItems: "center" },
  placeholderText: { fontSize: 20, fontWeight: "bold", color: "#666" },
  chatInfo: { flex: 1, marginLeft: 15 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nameText: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  itemTitle: { fontSize: 13, fontWeight: "500", color: "#666", marginVertical: 2 },
  lastMessage: { fontSize: 14, color: "#888" },
  unreadMessage: { color: "#000", fontWeight: "600" },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#FF3B30" },
});