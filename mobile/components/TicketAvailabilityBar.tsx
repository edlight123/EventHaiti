import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../config/brand';

export interface TicketAvailabilityBarProps {
  totalTickets: number;
  ticketsSold: number;
  style?: any;
}

export default function TicketAvailabilityBar({
  totalTickets,
  ticketsSold,
  style,
}: TicketAvailabilityBarProps) {
  const remainingTickets = Math.max(0, totalTickets - ticketsSold);
  const percentageSold = totalTickets > 0 ? (ticketsSold / totalTickets) * 100 : 0;
  const isSoldOut = remainingTickets === 0;
  const isAlmostSoldOut = !isSoldOut && remainingTickets < 10;

  // Don't show if no tickets info
  if (totalTickets === 0) return null;

  const getBarColor = () => {
    if (isSoldOut) return COLORS.error;
    if (isAlmostSoldOut) return COLORS.warning;
    if (percentageSold > 70) return COLORS.secondary;
    return COLORS.success;
  };

  const getStatusText = () => {
    if (isSoldOut) return 'Sold Out';
    if (isAlmostSoldOut) return `Only ${remainingTickets} left!`;
    if (percentageSold > 70) return `${remainingTickets} tickets remaining`;
    return `${remainingTickets} available`;
  };

  return (
    <View style={[styles.container, style]}>
      {/* Progress Bar */}
      <View style={styles.barContainer}>
        <View style={styles.barBackground}>
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.min(percentageSold, 100)}%`,
                backgroundColor: getBarColor(),
              },
            ]}
          />
        </View>
      </View>

      {/* Status Text */}
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.statusText,
            {
              color: getBarColor(),
              fontWeight: isAlmostSoldOut || isSoldOut ? '700' : '600',
            },
          ]}
        >
          {getStatusText()}
        </Text>
        <Text style={styles.soldText}>
          {ticketsSold.toLocaleString()} / {totalTickets.toLocaleString()} sold
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  barContainer: {
    marginBottom: 6,
  },
  barBackground: {
    height: 6,
    backgroundColor: COLORS.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    minWidth: 4,
  },
  textContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  soldText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});
