import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Dimensions,
  RefreshControl,
  Linking,
  Animated,
  Platform,
  ImageBackground,
} from 'react-native';
import {
  Shield,
  Calendar,
  Users,
  Star,
  ChevronLeft,
  MapPin,
  Globe,
  Mail,
  Phone,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react-native';
import { doc, getDoc, collection, query, where, getDocs, addDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../config/brand';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 240;

interface SocialLink {
  type: 'website' | 'instagram' | 'facebook' | 'tiktok' | 'whatsapp' | 'email';
  url: string;
  icon: any;
  color: string;
}

export default function OrganizerProfileScreen({ route, navigation }: any) {
  const { organizerId } = route.params;
  const { user } = useAuth();
  
  const [organizer, setOrganizer] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followDocId, setFollowDocId] = useState<string | null>(null);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [stats, setStats] = useState({
    followerCount: 0,
    totalEvents: 0,
    totalTicketsSold: 0,
    rating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrganizerProfile();
    checkFollowStatus();
  }, [organizerId]);

  const fetchOrganizerProfile = async () => {
    try {
      const organizerDoc = await getDoc(doc(db, 'users', organizerId));
      if (!organizerDoc.exists()) {
        navigation.goBack();
        return;
      }

      const organizerData = {
        id: organizerDoc.id,
        ...organizerDoc.data()
      };
      setOrganizer(organizerData);

      // Fetch events
      const eventsQuery = query(
        collection(db, 'events'),
        where('organizer_id', '==', organizerId),
        where('is_published', '==', true)
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      
      const now = new Date();
      const upcoming: any[] = [];
      const past: any[] = [];
      let totalSold = 0;

      eventsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const eventData = {
          id: doc.id,
          ...data,
          start_datetime: data.start_datetime?.toDate ? data.start_datetime.toDate() : new Date(data.start_datetime)
        };

        totalSold += data.tickets_sold || 0;

        if (eventData.start_datetime >= now) {
          upcoming.push(eventData);
        } else {
          past.push(eventData);
        }
      });

      upcoming.sort((a, b) => a.start_datetime.getTime() - b.start_datetime.getTime());
      past.sort((a, b) => b.start_datetime.getTime() - a.start_datetime.getTime());

      setUpcomingEvents(upcoming);
      setPastEvents(past);

      // Fetch follower count
      const followersQuery = query(
        collection(db, 'organizer_followers'),
        where('organizer_id', '==', organizerId)
      );
      const followersSnapshot = await getDocs(followersQuery);

      setStats({
        followerCount: followersSnapshot.size,
        totalEvents: eventsSnapshot.size,
        totalTicketsSold: totalSold,
        rating: (organizerData as any).rating || 0,
      });

    } catch (error) {
      console.error('Error fetching organizer profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!user) return;
    
    try {
      const followQuery = query(
        collection(db, 'organizer_followers'),
        where('organizer_id', '==', organizerId),
        where('follower_id', '==', user.uid)
      );
      const snapshot = await getDocs(followQuery);
      
      if (!snapshot.empty) {
        setIsFollowing(true);
        setFollowDocId(snapshot.docs[0].id);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      navigation.navigate('Auth');
      return;
    }

    try {
      if (isFollowing && followDocId) {
        await deleteDoc(doc(db, 'organizer_followers', followDocId));
        setIsFollowing(false);
        setFollowDocId(null);
        setStats(prev => ({ ...prev, followerCount: prev.followerCount - 1 }));
      } else {
        const docRef = await addDoc(collection(db, 'organizer_followers'), {
          organizer_id: organizerId,
          follower_id: user.uid,
          created_at: Timestamp.now(),
        });
        setIsFollowing(true);
        setFollowDocId(docRef.id);
        setStats(prev => ({ ...prev, followerCount: prev.followerCount + 1 }));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening link:', error);
    }
  };

  const getSocialLinks = (): SocialLink[] => {
    const links: SocialLink[] = [];
    
    if (organizer?.website) {
      links.push({
        type: 'website',
        url: organizer.website,
        icon: Globe,
        color: '#6B7280',
      });
    }
    
    if (organizer?.instagram) {
      links.push({
        type: 'instagram',
        url: `https://instagram.com/${organizer.instagram.replace('@', '')}`,
        icon: ExternalLink,
        color: '#E4405F',
      });
    }
    
    if (organizer?.facebook) {
      links.push({
        type: 'facebook',
        url: `https://facebook.com/${organizer.facebook}`,
        icon: ExternalLink,
        color: '#1877F2',
      });
    }
    
    if (organizer?.tiktok) {
      links.push({
        type: 'tiktok',
        url: `https://tiktok.com/@${organizer.tiktok.replace('@', '')}`,
        icon: ExternalLink,
        color: '#000000',
      });
    }
    
    if (organizer?.whatsapp) {
      links.push({
        type: 'whatsapp',
        url: `https://wa.me/${organizer.whatsapp}`,
        icon: MessageCircle,
        color: '#25D366',
      });
    }
    
    if (organizer?.email) {
      links.push({
        type: 'email',
        url: `mailto:${organizer.email}`,
        icon: Mail,
        color: '#EF4444',
      });
    }
    
    return links;
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrganizerProfile();
    checkFollowStatus();
  };

  const renderEventCard = (event: any, isCompact = false) => (
    <TouchableOpacity
      key={event.id}
      style={isCompact ? styles.eventCardCompact : styles.eventCard}
      onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
      activeOpacity={0.9}
    >
      {event.banner_image_url ? (
        <Image
          source={{ uri: event.banner_image_url }}
          style={isCompact ? styles.eventImageCompact : styles.eventImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[isCompact ? styles.eventImageCompact : styles.eventImage, styles.eventImagePlaceholder]}>
          <Calendar size={isCompact ? 20 : 32} color={COLORS.primary + '40'} />
        </View>
      )}

      {event.category && (
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{event.category}</Text>
        </View>
      )}

      <View style={styles.eventCardContent}>
        <Text style={isCompact ? styles.eventTitleCompact : styles.eventTitle} numberOfLines={2}>
          {event.title}
        </Text>

        <View style={styles.eventMeta}>
          <Text style={styles.eventDate}>
            {format(event.start_datetime, 'MMM d, yyyy')}
          </Text>
          {event.city && (
            <Text style={styles.eventLocation} numberOfLines={1}>
              {event.city}
            </Text>
          )}
        </View>

        {!isCompact && (
          <View style={styles.eventFooter}>
            {event.ticket_price > 0 ? (
              <Text style={styles.eventPrice}>
                {event.currency || 'HTG'} {event.ticket_price.toLocaleString()}
              </Text>
            ) : (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>FREE</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  // Get subtitle
  const getSubtitle = () => {
    const parts = [];
    if (organizer.categories && organizer.categories.length > 0) {
      parts.push(organizer.categories[0]);
    }
    if (organizer.city) {
      parts.push(organizer.city);
    }
    return parts.join(' · ');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading organizer profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!organizer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Organizer not found</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              fetchOrganizerProfile();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const socialLinks = getSocialLinks();
  const hostingSince = organizer.createdAt 
    ? new Date(organizer.createdAt.seconds ? organizer.createdAt.seconds * 1000 : organizer.createdAt).getFullYear()
    : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Sticky Header */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {organizer.full_name[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.headerName} numberOfLines={1}>
            {organizer.full_name}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.headerFollowButton, isFollowing && styles.headerFollowButtonActive]}
          onPress={handleFollow}
        >
          <Text style={[styles.headerFollowButtonText, isFollowing && styles.headerFollowButtonTextActive]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Hero Section */}
        <Animated.View style={[styles.hero, { transform: [{ translateY: headerTranslate }] }]}>
          {organizer.coverImageUrl ? (
            <Image
              source={{ uri: organizer.coverImageUrl }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.coverImagePlaceholder} />
          )}

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.heroOverlay}>
            <View style={styles.avatar}>
              {organizer.avatarUrl ? (
                <Image source={{ uri: organizer.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {organizer.full_name[0].toUpperCase()}
                </Text>
              )}
            </View>

            <View style={styles.heroInfo}>
              <View style={styles.nameContainer}>
                <Text style={styles.organizerName} numberOfLines={2}>
                  {organizer.full_name}
                </Text>
                {organizer.is_verified && (
                  <View style={styles.verifiedBadge}>
                    <Shield size={12} color="#FFF" fill="#FFF" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>

              {/* Categories & Location Pills */}
              <View style={styles.pillsRow}>
                {organizer.categories?.slice(0, 2).map((cat: string, idx: number) => (
                  <View key={idx} style={styles.pill}>
                    <Text style={styles.pillText}>{cat}</Text>
                  </View>
                ))}
                {organizer.city && (
                  <View style={styles.pill}>
                    <MapPin size={12} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.pillText}>{organizer.city}</Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.followButton, isFollowing && styles.followingButton]}
                  onPress={handleFollow}
                >
                  <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>

                {(organizer.whatsapp || organizer.phone || organizer.email) && (
                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={() => {
                      if (organizer.whatsapp) {
                        openLink(`https://wa.me/${organizer.whatsapp}`);
                      } else if (organizer.phone) {
                        openLink(`tel:${organizer.phone}`);
                      } else if (organizer.email) {
                        openLink(`mailto:${organizer.email}`);
                      }
                    }}
                  >
                    <MessageCircle size={18} color="#FFF" />
                    <Text style={styles.contactButtonText}>Contact</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Animated.View>

        <View style={styles.content}>
          {/* Stats Strip */}
          <View style={styles.statsStrip}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.totalEvents}</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.followerCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.totalTicketsSold.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Tickets Sold</Text>
            </View>
            {stats.rating > 0 && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <View style={styles.ratingRow}>
                    <Star size={16} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.statValue}>{stats.rating.toFixed(1)}</Text>
                  </View>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
              </>
            )}
          </View>

          {/* CTA Card */}
          {!isFollowing && (
            <View style={styles.ctaCard}>
              <Text style={styles.ctaTitle}>
                Never miss an event from {organizer.full_name}
              </Text>
              <TouchableOpacity style={styles.ctaButton} onPress={handleFollow}>
                <Text style={styles.ctaButtonText}>Follow Now</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Upcoming Events */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <Text style={styles.sectionSubtitle}>
              {upcomingEvents.length} event{upcomingEvents.length !== 1 ? 's' : ''} coming soon
            </Text>

            {upcomingEvents.length > 0 ? (
              <View style={styles.eventsGrid}>
                {upcomingEvents.map((event) => renderEventCard(event, false))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Calendar size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyStateTitle}>No Upcoming Events</Text>
                <Text style={styles.emptyStateText}>
                  {isFollowing 
                    ? "You'll be notified when new events are announced."
                    : "Follow to be notified when new events are announced."}
                </Text>
              </View>
            )}
          </View>

          {/* Past Events (Collapsible) */}
          {pastEvents.length > 0 && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => setShowPastEvents(!showPastEvents)}
              >
                <View>
                  <Text style={styles.sectionTitle}>Past Events</Text>
                  <Text style={styles.sectionSubtitle}>
                    {pastEvents.length} event{pastEvents.length !== 1 ? 's' : ''} organized
                  </Text>
                </View>
                {showPastEvents ? (
                  <ChevronUp size={24} color={COLORS.text} />
                ) : (
                  <ChevronDown size={24} color={COLORS.text} />
                )}
              </TouchableOpacity>

              {showPastEvents && (
                <View style={styles.eventsGrid}>
                  {pastEvents.slice(0, 6).map((event) => renderEventCard(event, true))}
                </View>
              )}
            </View>
          )}

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            
            {organizer.description && (
              <Text style={styles.aboutText}>{organizer.description}</Text>
            )}

            <View style={styles.aboutDetails}>
              {organizer.city && organizer.country && (
                <View style={styles.aboutRow}>
                  <MapPin size={18} color={COLORS.textSecondary} />
                  <Text style={styles.aboutLabel}>Location:</Text>
                  <Text style={styles.aboutValue}>
                    {organizer.city}, {organizer.country}
                  </Text>
                </View>
              )}

              {organizer.languages && organizer.languages.length > 0 && (
                <View style={styles.aboutRow}>
                  <Globe size={18} color={COLORS.textSecondary} />
                  <Text style={styles.aboutLabel}>Languages:</Text>
                  <Text style={styles.aboutValue}>
                    {organizer.languages.join(', ')}
                  </Text>
                </View>
              )}

              {hostingSince && (
                <View style={styles.aboutRow}>
                  <Calendar size={18} color={COLORS.textSecondary} />
                  <Text style={styles.aboutLabel}>Hosting events since:</Text>
                  <Text style={styles.aboutValue}>{hostingSince}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Social & Contact Section */}
          {socialLinks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Connect</Text>
              <View style={styles.socialLinks}>
                {socialLinks.map((link, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.socialButton, { backgroundColor: link.color + '15' }]}
                    onPress={() => openLink(link.url)}
                  >
                    <link.icon size={22} color={link.color} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Reviews Placeholder */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            <View style={styles.reviewsPlaceholder}>
              <Star size={40} color={COLORS.textSecondary} />
              <Text style={styles.reviewsPlaceholderText}>
                Reviews are coming soon to Event Haiti.
              </Text>
            </View>
          </View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Sticky Header
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_MIN_HEIGHT,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 12,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  headerName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerFollowButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
  },
  headerFollowButtonActive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerFollowButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  headerFollowButtonTextActive: {
    color: COLORS.text,
  },

  // Hero Section
  hero: {
    height: HEADER_MAX_HEIGHT,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 60,
    backgroundColor: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
  },
  heroInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  organizerName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    flex: 1,
    lineHeight: 28,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pillText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  followButton: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  followingButtonText: {
    color: '#FFF',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  contactButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Content
  content: {
    padding: 16,
  },
  
  // Stats Strip
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // CTA Card
  ctaCard: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    lineHeight: 22,
  },
  ctaButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Sections
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  // Events
  eventsGrid: {
    gap: 16,
  },
  eventCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventCardCompact: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
  },
  eventImage: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.borderLight,
  },
  eventImageCompact: {
    width: 100,
    height: 100,
    backgroundColor: COLORS.borderLight,
  },
  eventImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  eventCardContent: {
    padding: 12,
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  eventTitleCompact: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
    lineHeight: 20,
  },
  eventMeta: {
    gap: 4,
    marginBottom: 12,
  },
  eventDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  eventLocation: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  freeBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  freeBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // About Section
  aboutText: {
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.text,
    marginBottom: 16,
  },
  aboutDetails: {
    gap: 12,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aboutLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  aboutValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },

  // Social Links
  socialLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Reviews Placeholder
  reviewsPlaceholder: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reviewsPlaceholderText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
});
