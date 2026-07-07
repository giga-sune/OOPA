import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Radius, Spacing } from '../../styles/globalDesignSystem';

export default function CheckoutProductSummary() {
    const route = useRoute<any>();
    
    // Safely extract parameters passed from DetailsScreen
    const { title, price, ratePeriod, image, ownerDisplayName } = route.params || {};

    return (
        <View style={styles.summaryCard}>
            {/* Product Image Thumbnail */}
            {image ? (
                <Image source={{ uri: image }} style={styles.productImage} />
            ) : (
                <View style={[styles.productImage, styles.imagePlaceholder]}>
                    <Ionicons name="image-outline" size={24} color="#94A3B8" />
                </View>
            )}

            {/* Product Details Specs */}
            <View style={styles.textContainer}>
                <Text style={styles.lenderTag}>Lender: {ownerDisplayName}</Text>
                <Text style={styles.productTitle} numberOfLines={2}>
                    {title || "Item Rental"}
                </Text>
                
                <Text style={styles.priceText}>
                    ${price}
                    <Text style={styles.periodText}>
                        /{ratePeriod === 'week' ? 'week' : 'mth'}
                    </Text>
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    summaryCard: {
        flexDirection: 'row',
        backgroundColor: Colors.white || '#FFF',
        padding: Spacing.md || 16,
        borderRadius: Radius.md || 14,
        gap: Spacing.md || 16,
        alignItems: 'center',
        marginVertical: Spacing.lg || 20,
    },
    productImage: {
        width: 110,
        height: 90,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        resizeMode: 'cover',
    },
    imagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    lenderTag: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    productTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.grayPrimary || '#0F172A',
        marginBottom: 6,
    },
    priceText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000000',
    },
    periodText: {
        fontSize: 13,
        fontWeight: '400',
        color: '#64748B',
    },
});