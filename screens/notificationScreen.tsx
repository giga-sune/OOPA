import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  writeBatch, 
  doc,
} from 'firebase/firestore';

import { db } from '../services/firebase/firebaseApp';
import { Colors, Radius, Spacing, Shadows } from '../styles/globalDesignSystem';

// Type definition matching your Firestore Notification documents
export interface NotificationItem {
  id: string;
  recipientUid: string;
  type: 'request_approved' | 'request_rejected' | 'new_request' | 'new_message' | 'general';
  categoryLabel: string;                   
  bodyText: string;                        
  propertyImageUrl: string | null;
  createdAt: Date;
  read: boolean;
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  const auth = getAuth();
  const currentUser = auth.currentUser;

  // Real-time listener for user-specific notifications
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const notificationsRef = collection(db, "notifications");
    // Strictly target notifications meant for the CURRENT USER
    const q = query(
      notificationsRef,
      where("recipientUid", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: NotificationItem[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          recipientUid: data.recipientUid,
          type: data.type,
          categoryLabel: data.categoryLabel || (data.type === 'new_message' ? 'New Message' : 'Notification'),
          bodyText: data.bodyText || '',
          propertyImageUrl: data.propertyImageUrl || null,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          read: data.read ?? false,
        };
      });

      // Sort manually on the client side to avoid missing index errors in Firestore
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setNotifications(items);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to notifications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Mass action: Delete/Clear all notifications for current user
  const handleClearAll = async () => {
    if (!currentUser || notifications.length === 0) return;

    try {
      const batch = writeBatch(db);
      notifications.forEach((notif) => {
        const docRef = doc(db, "notifications", notif.id);
        batch.delete(docRef);
      });
      await batch.commit();
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  };

  // Helper: Generates relative dates like "2m ago", "5d ago"
  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.max(1, Math.floor(diffInMs / 60000));
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${diffInDays}d ago`;
  };

  // Helper: Renders the appropriate dynamic icon based on type
  const renderNotificationIcon = (type: NotificationItem['type']) => {
    if (type === 'request_approved') {
      return (
        <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
          <Ionicons name="checkmark-circle" size={18} color="#15803D" />
        </View>
      );
    }
    if (type === 'request_rejected') {
      return (
        <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
          <Ionicons name="close-circle" size={18} color="#B91C1C" />
        </View>
      );
    }
    if (type === 'new_message') {
      return (
        <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
          <Ionicons name="chatbubble-ellipses" size={18} color="#0284C7" />
        </View>
      );
    }
    // New Incoming Booking Request or default
    return (
      <View style={[styles.iconCircle, { backgroundColor: '#FFEDD5' }]}>
        <Ionicons name="mail" size={18} color="#D97706" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.grayPrimary || "#0F172A"} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centerScreen}>
          <ActivityIndicator size="large" color={Colors.primary || "#FF7A21"} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerScreen}>
          <Ionicons name="notifications-off-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyText}>You're all caught up!</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.notificationCard}>
                
                {/* Left Dynamic Action Icon */}
                {renderNotificationIcon(item.type)}

                {/* Middle text content column */}
                <View style={styles.textDetailsColumn}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.categoryLabel}>{item.categoryLabel}</Text>
                    <Text style={styles.timeText}>{getRelativeTime(item.createdAt)}</Text>
                  </View>
                  <Text style={styles.bodyText} numberOfLines={3}>
                    {item.bodyText}
                  </Text>
                </View>

                {/* Right Product Image Thumbnail */}
                {item.propertyImageUrl ? (
                  <Image source={{ uri: item.propertyImageUrl }} style={styles.productThumbnail} />
                ) : (
                  <View style={styles.imageFallbackSquare}>
                    <Ionicons name="cube-outline" size={16} color="#94A3B8" />
                  </View>
                )}

              </View>
            )}
          />

          {/* Persistent Bottom "Clear All" trigger overlay */}
          <View style={styles.bottomFooterBar}>
            <TouchableOpacity 
              style={styles.clearAllButton} 
              activeOpacity={0.8}
              onPress={handleClearAll}
            >
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white || '#FFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md || 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.grayPrimary || '#0F172A',
  },
  centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  listContent: { paddingHorizontal: Spacing.lg || 16, paddingTop: 12, paddingBottom: 100 },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill || 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  textDetailsColumn: { flex: 1, gap: 4 },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  bodyText: {
    fontSize: 14,
    color: Colors.grayPrimary || '#0F172A',
    lineHeight: 20,
    fontWeight: '500',
  },
  productThumbnail: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm || 8,
    resizeMode: 'cover',
    backgroundColor: '#F1F5F9',
  },
  imageFallbackSquare: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm || 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomFooterBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  clearAllButton: {
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: Radius.pill || 20,
    borderWidth: 1,
    borderColor: Colors.primary || '#FF7A21',
    backgroundColor: Colors.white || '#FFF',
    ...Shadows.lightDrop,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary || '#FF7A21',
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
});