import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getAuth } from "firebase/auth";
import { subscribeToMessages, sendMessage, markChatAsRead, type ChatMessage } from "../services/chat/chatService";
import type { RootStackParamList } from "../types/navigation/navigationTypes";

type ChatRoomScreenRouteProp = RouteProp<RootStackParamList, "ChatRoom">;
type ChatRoomScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "ChatRoom">;

export default function ChatRoomScreen() {
  const route = useRoute<ChatRoomScreenRouteProp>();
  const navigation = useNavigation<ChatRoomScreenNavigationProp>();
  const { rentalId, title, recipientUid, recipientName } = route.params;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const auth = getAuth();
  const currentUserUid = auth.currentUser?.uid;

  useEffect(() => {
    // Set screen header dynamically to match recipient identity
    navigation.setOptions({ title: recipientName });

    if (!currentUserUid) return;

    // Stream individual text exchanges
    const unsubscribe = subscribeToMessages(
      rentalId,
      (incomingMessages) => {
        setMessages(incomingMessages);
        // Mark as read whenever a new message comes in while room is active
        markChatAsRead(rentalId, currentUserUid).catch((error) => {
          console.error("Failed to mark chat as read:", error);
        });
      },
      (error) => {
        console.error("Failed to load messages:", error);
      }
    );

    return () => unsubscribe();
  }, [rentalId, currentUserUid, recipientName, navigation]);

  const handleSend = async () => {
    if (!inputText.trim() || !currentUserUid) return;

    const messageContent = inputText.trim();
    setInputText(""); // Clear promptly for UI responsiveness

    try {
      await sendMessage(rentalId, currentUserUid, recipientUid, messageContent);
    } catch (error) {
      console.error("Failed to transmit text content:", error);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Dynamic Context Header Banner */}
        <View style={styles.contextBanner}>
          <Text style={styles.contextBannerText} numberOfLines={1}>
            Discussing: <Text style={{ fontWeight: "700" }}>{title}</Text>
          </Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isMe = item.senderUid === currentUserUid;
            return (
              <View style={[styles.messageBubbleContainer, isMe ? styles.myBubbleAlign : styles.theirBubbleAlign]}>
                <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                  <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                    {item.text}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {/* Input Bar Layout Control */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.disabledSendButton]} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  contextBanner: { backgroundColor: "#F5F5F7", paddingVertical: 8, paddingHorizontal: 15, borderBottomWidth: 1, borderColor: "#E5E5EA" },
  contextBannerText: { fontSize: 13, color: "#666", textAlign: "center" },
  messagesList: { paddingHorizontal: 15, paddingVertical: 10 },
  messageBubbleContainer: { marginVertical: 4, flexDirection: "row", width: "100%" },
  myBubbleAlign: { justifyContent: "flex-end" },
  theirBubbleAlign: { justifyContent: "flex-start" },
  bubble: { maxWidth: "75%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  myBubble: { backgroundColor: "#007AFF", borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: "#E5E5EA", borderBottomLeftRadius: 4 },
  messageText: { fontSize: 16 },
  myMessageText: { color: "#FFF" },
  theirMessageText: { color: "#000" },
  inputContainer: { 
    flexDirection: "row", 
    padding: 12, 
    borderTopWidth: 1, 
    borderColor: "#F0F0F0", 
    alignItems: "center", 
    backgroundColor: "#FFF",
    paddingBottom: Platform.OS === "ios" ? 24 : 12
  },
  input: { flex: 1, minHeight: 40, maxHeight: 100, backgroundColor: "#F2F2F7", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, fontSize: 16, marginRight: 10, color: "#000" },
  sendButton: { backgroundColor: "#007AFF", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, justifyContent: "center" },
  disabledSendButton: { backgroundColor: "#B3D7FF" },
  sendButtonText: { color: "#FFF", fontWeight: "600", fontSize: 15 },
});
