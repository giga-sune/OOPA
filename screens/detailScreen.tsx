import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  FlatList
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Circle } from 'react-native-maps';
import { doc, getDoc } from 'firebase/firestore';

import { db } from '../services/firebase/firebaseApp';
import { Colors, Typography, Radius, Spacing, Shadows } from '../styles/globalDesignSystem';
import { getPropertyById, getUserProperties } from '../services/firestore/propertyService';
import { getPropertyReviewSummary, type Review } from '../services/firestore/reviewService';
import type { Property } from '../types/property/propertyTypes';

const { width } = Dimensions.get('window');

export default function DetailsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { propertyId } = route.params;

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [ownerListingsCount, setOwnerListingsCount] = useState<number>(0);

  const [ownerProfile, setOwnerProfile] = useState<{ displayName: string; photoURL: string | null } | null>(null);

  // Review System States
  const [reviewsPreview, setReviewsPreview] = useState<Review[]>([]);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);

  useEffect(() => {
    async function loadItemAndOwnerData() {
      try {
        setLoading(true);
        const data = await getPropertyById(propertyId);
        if (data) {
          setProperty(data);

          // Fetch local reviews metadata
          const reviewsData = await getPropertyReviewSummary(propertyId);
          setReviewsPreview(reviewsData.reviewsPreview);
          setTotalReviews(reviewsData.totalReviews);
          setAverageRating(reviewsData.averageRating);

          if (data.ownerUid) {
            const userListings = await getUserProperties(data.ownerUid);
            setOwnerListingsCount(userListings.length);

            const userDocRef = doc(db, "users", data.ownerUid);
            const userSnapshot = await getDoc(userDocRef);

            if (userSnapshot.exists()) {
              const userData = userSnapshot.data();
              setOwnerProfile({
                displayName: userData?.userName || userData?.displayName || "OOPA User",
                photoURL: userData?.profilePictureUrl || null,
              });
            } else {
              setOwnerProfile({
                displayName: data.ownerDisplayName || "OOPA User",
                photoURL: data.ownerPhotoURL || null,
              });
            }
          }
        }
      } catch (err) {
        console.error("Error loading property details or owner metrics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadItemAndOwnerData();
  }, [propertyId]);

  const handleScroll = (event: any) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(scrollOffset / width);
    setActiveImageIndex(currentIndex);
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={13}
            color="#F59E0B"
            style={{ marginRight: 1 }}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary || "#FF7A21"} />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Listing not found.</Text>
      </View>
    );
  }

  const latitude = property.location?.latitude ?? 43.6532;
  const longitude = property.location?.longitude ?? -79.3832;

  const handleMapPress = () => {
    navigation.navigate("MapViewer", { latitude, longitude });
  };

  return (
    <View style={styles.mainContainer}>

      {/* Floating Action Header Bar */}
      <SafeAreaView style={styles.floatingHeader}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconCircleButton}>
            <Ionicons name="chevron-back" size={22} color={Colors.grayPrimary || "#0F172A"} />
          </TouchableOpacity>

          <View style={styles.headerRightGroup}>
            <TouchableOpacity onPress={() => setIsFavorited(!isFavorited)} style={styles.iconCircleButton}>
              <Ionicons
                name={isFavorited ? "heart" : "heart-outline"}
                size={22}
                color={isFavorited ? (Colors.primary || "#FF7A21") : "#0F172A"}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconCircleButton}>
              <Ionicons name="share-outline" size={22} color={Colors.grayPrimary || "#0F172A"} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Horizontal Swiper Area */}
        <View style={styles.swiperWrapper}>
          {property.images && property.images.length > 0 ? (
            <FlatList
              data={property.images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              keyExtractor={(_, index) => index.toString()}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.heroImage} />
              )}
            />
          ) : (
            <View style={[styles.heroImage, styles.imagePlaceholder]}>
              <Ionicons name="image-outline" size={48} color="#CCC" />
            </View>
          )}

          {/* Pagination Indicators UI Overlay */}
          {property.images && property.images.length > 1 && (
            <View style={styles.paginationDotsRow}>
              {property.images.map((_, idx) => (
                <View
                  key={idx.toString()}
                  style={[
                    styles.dotItem,
                    activeImageIndex === idx ? styles.dotActive : styles.dotInactive
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Content Details Block */}
        <View style={styles.detailsContentBlock}>
          <Text style={styles.mainTitle}>{property.title}</Text>

          <Text style={styles.ratePrice}>
            ${property.price}
            <Text style={styles.ratePeriodText}>/{property.ratePeriod === 'week' ? 'week' : 'mth'}</Text>
          </Text>

          <Text style={styles.metaLabelRow}>
            {property.priceType}  •  32 views  •  30min ago
          </Text>

          <Text style={styles.descriptionText}>{property.description}</Text>

          <View style={styles.attributeItemRow}>
            <Text style={styles.attributeItemLabel}>Condition</Text>
            <Text style={styles.attributeItemValue}>{property.condition}</Text>
          </View>

          <View style={styles.attributeItemRow}>
            <Text style={styles.attributeItemLabel}>Brand</Text>
            <Text style={styles.attributeItemValue}>{property.brand}</Text>
          </View>

          {/* Reviews Summary Section */}
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeaderRow}>
              <Text style={styles.blockSectionHeadingWithoutMargin}>Reviews</Text>
              {totalReviews > 0 && (
                <View style={styles.averageBadge}>
                  <Ionicons name="star" size={14} color="#D97706" style={{ marginRight: 4 }} />
                  <Text style={styles.averageRatingText}>
                    {averageRating} <Text style={styles.totalRatingCount}>({totalReviews})</Text>
                  </Text>
                </View>
              )}
            </View>

            {totalReviews === 0 ? (
              <Text style={styles.noReviewsText}>No reviews yet. Be the first to rent and leave feedback!</Text>
            ) : (
              <View style={styles.reviewsWrapper}>
                {reviewsPreview.map((review) => (
                  <View key={review.rentalId} style={styles.miniReviewCard}>
                    <View style={styles.miniReviewHeader}>
                      {review.reviewerPhotoURL ? (
                        <Image source={{ uri: review.reviewerPhotoURL }} style={styles.miniAvatar} />
                      ) : (
                        <View style={styles.miniAvatarFallback}>
                          <Ionicons name="person" size={12} color="#94A3B8" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.miniReviewerName} numberOfLines={1}>
                          {review.reviewerDisplayName || "Anonymous Renter"}
                        </Text>
                        {renderStars(review.rating)}
                      </View>
                      <Text style={styles.miniDate}>
                        {review.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    <Text style={styles.miniReviewText} numberOfLines={2}>
                      {review.reviewText}
                    </Text>
                  </View>
                ))}

                <TouchableOpacity 
                  style={styles.seeAllButton}
                  onPress={() => navigation.navigate("AllReviews", { propertyId, propertyTitle: property.title })}
                >
                  <Text style={styles.seeAllButtonText}>See All {totalReviews} Reviews</Text>
                  <Ionicons name="arrow-forward" size={16} color={Colors.primary || '#FF7A21'} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Where to Meet Static Map Area Preview */}
          <Text style={styles.blockSectionHeading}>Where to meet</Text>
          <TouchableOpacity activeOpacity={0.9} onPress={handleMapPress} style={styles.staticMapCard}>
            <MapView
              style={styles.mapCanvas}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              initialRegion={{
                latitude: latitude,
                longitude: longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
            >
              <Circle
                center={{ latitude, longitude }}
                radius={450}
                strokeColor="rgba(255, 122, 33, 0.4)"
                fillColor="rgba(255, 122, 33, 0.12)"
              />
            </MapView>
          </TouchableOpacity>

          {/* Owner Profile Row Widget */}
          <View style={styles.ownerProfileWidget}>
            <View style={styles.ownerProfileDetailsSide}>
              {ownerProfile?.photoURL ? (
                <Image source={{ uri: ownerProfile.photoURL }} style={styles.ownerAvatarImg} />
              ) : (
                <View style={styles.ownerAvatarFallback}>
                  <Ionicons name="person" size={20} color="#94A3B8" />
                </View>
              )}
              <View>
                <Text style={styles.ownerProfileName}>
                  {ownerProfile?.displayName || "Anonymous Lender"}
                </Text>
                <Text style={styles.ownerSubheadingText}>
                  {ownerListingsCount} {ownerListingsCount === 1 ? 'listing' : 'listings'}
                </Text>
              </View>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Footer Rental CTA Action Bar */}
      <View style={styles.bottomStickyBar}>
        <View>
          <Text style={styles.bottomBarPriceText}>${property.price}</Text>
          <Text style={styles.bottomBarSubText}>per {property.ratePeriod === 'week' ? 'week' : 'month'}</Text>
        </View>
        <TouchableOpacity
          style={styles.mainRentCTAButton}
          activeOpacity={0.85}
          onPress={() => {
            if (property) {
              navigation.navigate("CheckoutScreen", {
                id: propertyId,
                ownerUid: property.ownerUid,
                title: property.title,
                price: property.price,
                ratePeriod: property.ratePeriod,
                lenderEmail: property.ownerEmail,
                image: property.images?.[0] || null,
                ownerDisplayName: ownerProfile?.displayName || "Lender"
              });
            }
          }}
        >
          <Text style={styles.mainRentCTAButtonText}>Rent Now</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: Colors.white || '#FFF' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white || '#FFF' },
  errorText: { ...Typography.bodyLarge, color: '#64748B' },
  floatingHeader: {
    position: 'absolute',
    top: Spacing.xs || 8,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg || 16,
    alignItems: 'center',
  },
  headerRightGroup: { flexDirection: 'row', gap: Spacing.sm || 10 },
  iconCircleButton: {
    backgroundColor: Colors.white || '#FFF',
    width: 40,
    height: 40,
    borderRadius: Radius.pill || 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lightDrop,
  },
  scrollContent: { paddingBottom: 120 },
  swiperWrapper: { position: 'relative' },
  heroImage: { width: width, height: width * 0.95, resizeMode: 'cover' },
  imagePlaceholder: { backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  paginationDotsRow: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6
  },
  dotItem: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 18,
    backgroundColor: Colors.primary || '#FF7A21',
  },
  dotInactive: {
    width: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  detailsContentBlock: { paddingHorizontal: Spacing.lg || 20, paddingTop: Spacing.lg || 20 },
  mainTitle: { ...Typography.h2, color: Colors.grayPrimary || '#0F172A', marginBottom: 6, fontWeight: '700' },
  ratePrice: { fontSize: 22, fontWeight: '700', color: Colors.grayPrimary || '#0F172A' },
  ratePeriodText: { fontSize: 14, fontWeight: '400', color: '#64748B' },
  metaLabelRow: { ...Typography.bodySmall, color: '#94A3B8', marginTop: 6, marginBottom: 16 },
  descriptionText: { ...Typography.body, color: '#334155', lineHeight: 22, marginBottom: 20 },
  attributeItemRow: { flexDirection: 'row', paddingVertical: 10 },
  attributeItemLabel: { fontSize: 15, fontWeight: '600', width: 110, color: Colors.grayPrimary || '#0F172A' },
  attributeItemValue: { fontSize: 15, color: '#475569' },
  blockSectionHeading: { ...Typography.h3, color: Colors.grayPrimary || '#0F172A', marginTop: 28, marginBottom: 12, fontWeight: '700' },
  blockSectionHeadingWithoutMargin: { ...Typography.h3, color: Colors.grayPrimary || '#0F172A', fontWeight: '700' },
  staticMapCard: { height: 160, borderRadius: Radius.md || 14, overflow: 'hidden', backgroundColor: '#E2E8F0' },
  mapCanvas: { ...StyleSheet.absoluteFillObject },
  ownerProfileWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 24,
  },
  ownerProfileDetailsSide: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ownerAvatarImg: { width: 44, height: 44, borderRadius: Radius.pill || 22, backgroundColor: '#F1F5F9' },
  ownerAvatarFallback: { width: 44, height: 44, borderRadius: Radius.pill || 22, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  ownerProfileName: { fontSize: 16, fontWeight: '600', color: Colors.grayPrimary || '#0F172A' },
  ownerSubheadingText: { fontSize: 13, color: '#64748B', marginTop: 2, fontWeight: '500' },
  bottomStickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white || '#FFF',
    paddingHorizontal: Spacing.xl || 24,
    paddingTop: 16,
    paddingBottom: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadows.lightDrop,
  },
  bottomBarPriceText: { fontSize: 22, fontWeight: '700', color: Colors.grayPrimary || '#0F172A' },
  bottomBarSubText: { fontSize: 12, color: '#64748B' },
  mainRentCTAButton: { backgroundColor: Colors.primary || '#FF7A21', paddingHorizontal: 36, paddingVertical: 14, borderRadius: Radius.pill || 26 },
  mainRentCTAButtonText: { color: Colors.white || '#FFF', fontSize: 16, fontWeight: '700' },

  // Reviews CSS Style Injections
  starsRow: { flexDirection: 'row' },
  reviewsSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 20,
    paddingBottom: 8,
  },
  reviewsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  averageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm || 6,
  },
  averageRatingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  totalRatingCount: {
    fontWeight: '400',
    color: '#D97706',
  },
  noReviewsText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  reviewsWrapper: {
    gap: 12,
  },
  miniReviewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md || 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  miniReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  miniAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniReviewerName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.grayPrimary || '#0F172A',
  },
  miniDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  miniReviewText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFF8F4',
    borderRadius: Radius.pill || 20,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FFE2D1',
  },
  seeAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary || '#FF7A21',
  },
});