import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Check, CheckCheck, Trash2, ExternalLink } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../config/brand';
import { useAuth } from '../contexts/AuthContext';
import { useAppMode } from '../contexts/AppModeContext';
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  clearAllNotifications,
} from '../lib/notifications';
import { backendJson } from '../lib/api/backend';
import type { Notification } from '../types/notifications';

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { setMode } = useAppMode();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const getInviteDetails = (notification: Notification): { eventId: string; token: string } | null => {
    const metadata: any = (notification as any)?.metadata || {};
    const eventId = String(metadata?.eventId || notification.eventId || '');
    const token = String(metadata?.token || '');
    if (eventId && token) return { eventId, token };

    const actionUrl = String((notification as any)?.actionUrl || '');
    if (actionUrl) {
      try {
        const full = actionUrl.startsWith('http')
          ? actionUrl
          : `https://eventhaiti.vercel.app${actionUrl.startsWith('/') ? '' : '/'}${actionUrl}`;
        const url = new URL(full);
        const parsedEventId = url.searchParams.get('eventId') || '';
        const parsedToken = url.searchParams.get('token') || '';
        if (parsedEventId && parsedToken) {
          return { eventId: parsedEventId, token: parsedToken };
        }
      } catch {
        // ignore
      }
    }

    return null;
  };

  const acceptStaffInvite = async (notification: Notification) => {
    const details = getInviteDetails(notification);
    if (!details) {
      Alert.alert('Missing invite details', 'Please open the invite link again.');
      return;
    }

    try {
      await backendJson('/api/staff/invites/redeem', {
        method: 'POST',
        body: JSON.stringify(details),
      });

      if (user?.uid && !notification.isRead) {
        await handleMarkAsRead(notification.id);
      }

      await setMode('staff');
      // @ts-ignore
      navigation.navigate('Main');
      // @ts-ignore
      navigation.navigate('TicketScanner', { eventId: details.eventId });
    } catch (error: any) {
      const msg = error?.message ? String(error.message) : 'Failed to accept invite.';
      Alert.alert('Could not accept invite', msg);
    }
  };

  const declineStaffInvite = async (notification: Notification) => {
    const details = getInviteDetails(notification);
    if (!details) {
      Alert.alert('Missing invite details', 'Please open the invite link again.');
      return;
    }

    try {
      await backendJson('/api/staff/invites/decline', {
        method: 'POST',
        body: JSON.stringify(details),
      });

      if (user?.uid && !notification.isRead) {
        await handleMarkAsRead(notification.id);
      }

      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    } catch (error: any) {
      const msg = error?.message ? String(error.message) : 'Failed to decline invite.';
      Alert.alert('Could not decline invite', msg);
    }
  };

  const loadNotifications = async (showLoader = true) => {
    if (!user?.uid) return;
    
    if (showLoader) setIsLoading(true);
    try {
      const [notificationsData, unreadCountData] = await Promise.all([
        getUserNotifications(user.uid, 50),
        getUnreadCount(user.uid),
      ]);
      setNotifications(notificationsData);
      setUnreadCount(unreadCountData);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [user?.uid])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadNotifications(false);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user?.uid) return;
    
    try {
      await markAsRead(user.uid, notificationId);

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.uid) return;
    
    try {
      await markAllAsRead(user.uid);

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleClearAll = async () => {
    const uid = user?.uid;
    if (!uid) return;

    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              await clearAllNotifications(uid);

              setNotifications([]);
              setUnreadCount(0);
            } catch (error) {
              console.error('Error clearing notifications:', error);
              Alert.alert('Error', 'Failed to clear notifications. Please try again.');
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ticket_purchased':
        return '🎫';
      case 'event_updated':
        return '📢';
      case 'event_reminder_24h':
      case 'event_reminder_3h':
      case 'event_reminder_30min':
        return '⏰';
      case 'event_cancelled':
        return '❌';
      case 'staff_invite':
        return '👥';
      default:
        return '🔔';
    }
  };

  const getNotificationLink = (notification: Notification): { screen: string; params?: any } | null => {
    if (notification.type === 'staff_invite') {
      const details = getInviteDetails(notification);
      if (details) {
        return { screen: 'InviteRedeem', params: details };
      }
    }
    if (notification.ticketId) {
      return { screen: 'TicketDetail', params: { ticketId: notification.ticketId } };
    }
    if (notification.eventId) {
      return { screen: 'EventDetail', params: { eventId: notification.eventId } };
    }
    return null;
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }

    const link = getNotificationLink(notification);
    if (link) {
      // @ts-ignore
      navigation.navigate(link.screen, link.params);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Clear All button (top right) - no duplicate title */}
      {notifications.length > 0 && (
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClearAll}
            disabled={isClearing}
            style={styles.clearAllButton}
            activeOpacity={0.7}
          >
            {isClearing ? (
              <ActivityIndicator size="small" color={COLORS.error} />
            ) : (
              <Text style={styles.clearAllText}>Clear all</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications List - minimal top spacing */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={64} color={COLORS.textSecondary} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>
              When you get notifications, they will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                onPress={() => handleNotificationClick(notification)}
                style={[
                  styles.notificationCard,
                  !notification.isRead && styles.notificationCardUnread,
                ]}
                activeOpacity={0.7}
              >
                {/* Icon */}
                <View style={styles.iconContainer}>
                  <Text style={styles.notificationIcon}>
                    {getNotificationIcon(notification.type)}
                  </Text>
                </View>

                {/* Content */}
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <Text
                      style={[
                        styles.notificationTitle,
                        !notification.isRead && styles.notificationTitleUnread,
                      ]}
                      numberOfLines={2}
                    >
                      {notification.title}
                    </Text>
                    {!notification.isRead && <View style={styles.unreadDot} />}
                  </View>

                  <Text style={styles.notificationMessage} numberOfLines={3}>
                    {notification.message}
                  </Text>

                  {notification.type === 'staff_invite' && (
                    <View style={styles.staffInviteActions}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          acceptStaffInvite(notification);
                        }}
                        style={styles.staffInviteAcceptButton}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.staffInviteAcceptText}>Accept</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          declineStaffInvite(notification);
                        }}
                        style={styles.staffInviteDeclineButton}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.staffInviteDeclineText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.notificationFooter}>
                    <Text style={styles.notificationTime}>
                      {new Date(notification.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                    {getNotificationLink(notification) && (
                      <View style={styles.viewDetailsContainer}>
                        <Text style={styles.viewDetailsText}>View details</Text>
                        <ExternalLink size={12} color={COLORS.primary} />
                      </View>
                    )}
                  </View>
                </View>

                {/* Mark as read button */}
                {!notification.isRead && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notification.id);
                    }}
                    style={styles.markReadButton}
                    activeOpacity={0.7}
                  >
                    <Check size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // Clear all button aligned right
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12, // Reduced from 16 for minimal spacing
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.errorLight || COLORS.background,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  notificationsList: {
    paddingHorizontal: 16,
    paddingTop: 16, // 16px gap below header
    paddingBottom: 16,
    gap: 8,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  notificationCardUnread: {
    borderLeftColor: COLORS.primary,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIcon: {
    fontSize: 24,
  },
  notificationContent: {
    flex: 1,
    gap: 6,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  notificationTitleUnread: {
    color: COLORS.text,
  },
  notificationMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  staffInviteActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 2,
  },
  staffInviteAcceptButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  staffInviteAcceptText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  staffInviteDeclineButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  staffInviteDeclineText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  notificationTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  markReadButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
