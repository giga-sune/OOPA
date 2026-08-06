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
import MapView, { Marker } from 'react-native-maps';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebase/firebaseApp';
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

  const [reviewsPreview, setReviewsPreview] = useState<Review[]>([]);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);

  const currentUser = auth.currentUser;

  useEffect(() => {
    async function loadItemAndOwnerData() {
      try {
        setLoading(true);
        const data = await getPropertyById(propertyId);
        if (data) {
          setProperty(data);

          const reviewsData = await getPropertyReviewSummary(propertyId);
          setReviewsPreview(reviewsData.reviewsPreview);
          setTotalReviews(reviewsData.totalReviews);
          setAverageRating(reviewsData.averageRating);

          if (data.ownerUid) {
            const userListings = await getUserProperties(data.ownerUid);
            setOwnerListingsCount(userListings.length);

            setOwnerProfile({
              displayName: data.ownerDisplayName || "OOPA User",
              photoURL: data.ownerPhotoURL || null,
            });
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

  useEffect(() => {
    if (!currentUser) return;
    const favRef = doc(db, "users", currentUser.uid, "savedItems", propertyId);
    const unsubscribe = onSnapshot(favRef, (docSnap) => {
      setIsFavorited(docSnap.exists());
    });
    return () => unsubscribe();
  }, [currentUser, propertyId]);

  const handleToggleFavorite = async () => {
    if (!currentUser) return;
    const favRef = doc(db, "users", currentUser.uid, "savedItems", propertyId);
    const nextState = !isFavorited;
    
    setIsFavorited(nextState); // Update immediately while the write is pending.
    try {
      if (nextState) {
        await setDoc(favRef, { propertyId, createdAt: serverTimestamp() });
      } else {
        await deleteDoc(favRef);
      }
    } catch (err) {
      console.error("Failed to update favorite state:", err);
      setIsFavorited(!nextState); // Restore the previous state if the write fails.
    }
  };

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

  const handleMapPress = () => {
    if (!property.location) return;

    navigation.navigate("MapViewer", {
      latitude: property.location.latitude,
      longitude: property.location.longitude,
      address: property.location.address,
    });
  };

  return (
    <View style={styles.mainContainer}>

      <SafeAreaView style={styles.floatingHeader}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconCircleButton}>
            <Ionicons name="chevron-back" size={22} color={Colors.grayPrimary || "#0F172A"} />
          </TouchableOpacity>

          <View style={styles.headerRightGroup}>
            <TouchableOpacity onPress={handleToggleFavorite} style={styles.iconCircleButton}>
              <Ionicons
                name={isFavorited ? "heart" : "heart-outline"}
                size={22}
                color={isFavorited ? "#FF7A21" : (Colors.grayPrimary || "#0F172A")}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconCircleButton}>
              <Ionicons name="share-outline" size={22} color={Colors.grayPrimary || "#0F172A"} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

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

        <View style={styles.detailsContentBlock}>
          <Text style={styles.mainTitle}>{property.title}</Text>

          <Text style={styles.ratePrice}>
            ${property.price}
            <Text style={styles.ratePeriodText}>/{property.ratePeriod === 'week' ? 'week' : 'mth'}</Text>
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

          {property.location && (
            <>
              <Text style={styles.blockSectionHeading}>Where to meet</Text>
              <TouchableOpacity activeOpacity={0.9} onPress={handleMapPress} style={styles.staticMapCard}>
                <MapView
                  style={styles.mapCanvas}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  initialRegion={{
                    latitude: property.location.latitude,
                    longitude: property.location.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }}
                >
                  <Marker
                    coordinate={{
                      latitude: property.location.latitude,
                      longitude: property.location.longitude,
                    }}
                    title={property.location.address}
                  />
                </MapView>
              </TouchableOpacity>
            </>
          )}

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
                propertyId,
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
