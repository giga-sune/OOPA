import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Radius, Spacing, Shadows } from '../styles/globalDesignSystem';
import { getReviewsForProperty, Review } from '../services/firestore/reviewService';

export default function AllReviewsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { propertyId, propertyTitle } = route.params;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchAllReviews() {
      try {
        const data = await getReviewsForProperty(propertyId);
        setReviews(data);
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAllReviews();
  }, [propertyId]);

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={14}
            color="#F59E0B"
            style={{ marginRight: 2 }}
          />
        ))}
      </View>
    );
  };

  const renderReviewItem = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewerHeader}>
        {item.reviewerPhotoURL ? (
          <Image source={{ uri: item.reviewerPhotoURL }} style={styles.reviewerAvatar} />
        ) : (
          <View style={styles.reviewerAvatarFallback}>
            <Ionicons name="person" size={16} color="#94A3B8" />
          </View>
        )}
        <View style={styles.reviewerMeta}>
          <Text style={styles.reviewerName}>{item.reviewerDisplayName || "Anonymous Renter"}</Text>
          <View style={styles.ratingDateRow}>
            {renderStars(item.rating)}
            <Text style={styles.dateText}>
              {item.createdAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.reviewText}>{item.reviewText}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.grayPrimary || "#0F172A"} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>Reviews</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{propertyTitle}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary || "#FF7A21"} />
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyText}>No reviews yet for this listing.</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.rentalId}
          renderItem={renderReviewItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white || '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg || 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitleContainer: { flex: 1 },
  headerTitle: { ...Typography.h3, fontWeight: '700', color: Colors.grayPrimary || '#0F172A' },
  headerSubtitle: { fontSize: 13, color: '#64748B', marginTop: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { ...Typography.body, color: '#64748B', marginTop: 12, textAlign: 'center' },
  listContent: { padding: Spacing.lg || 20, gap: 16 },
  reviewCard: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  reviewerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  reviewerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9' },
  reviewerAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  reviewerMeta: { marginLeft: 10, flex: 1 },
  reviewerName: { fontSize: 14, fontWeight: '600', color: Colors.grayPrimary || '#0F172A' },
  ratingDateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 8 },
  starsRow: { flexDirection: 'row' },
  dateText: { fontSize: 11, color: '#94A3B8' },
  reviewText: { ...Typography.body, fontSize: 14, color: '#475569', lineHeight: 20 },
});