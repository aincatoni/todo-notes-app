import React from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TaskFilter } from '../types/task';

interface TaskFilterBarProps {
  filter: TaskFilter;
  onSelectFilter: (filter: TaskFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  counts: {
    total: number;
    pending: number;
    completed: number;
  };
}

export const TaskFilterBar: React.FC<TaskFilterBarProps> = ({
  filter,
  onSelectFilter,
  searchQuery,
  onSearchChange,
  counts,
}) => {
  return (
    <View style={styles.container}>
      {/* Barra de búsqueda */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar tareas o notas..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => onSearchChange('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </Pressable>
        )}
      </View>

      {/* Selector de filtros */}
      <View style={styles.filterTabs}>
        <Pressable
          style={[styles.tab, filter === 'all' && styles.activeTab]}
          onPress={() => onSelectFilter('all')}
        >
          <Text style={[styles.tabText, filter === 'all' && styles.activeTabText]}>
            Todas
          </Text>
          <View style={[styles.tabBadge, filter === 'all' && styles.activeTabBadge]}>
            <Text style={[styles.tabBadgeText, filter === 'all' && styles.activeTabBadgeText]}>
              {counts.total}
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.tab, filter === 'pending' && styles.activeTab]}
          onPress={() => onSelectFilter('pending')}
        >
          <Text style={[styles.tabText, filter === 'pending' && styles.activeTabText]}>
            Pendientes
          </Text>
          <View style={[styles.tabBadge, filter === 'pending' && styles.activeTabBadge]}>
            <Text style={[styles.tabBadgeText, filter === 'pending' && styles.activeTabBadgeText]}>
              {counts.pending}
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.tab, filter === 'completed' && styles.activeTab]}
          onPress={() => onSelectFilter('completed')}
        >
          <Text style={[styles.tabText, filter === 'completed' && styles.activeTabText]}>
            Completadas
          </Text>
          <View style={[styles.tabBadge, filter === 'completed' && styles.activeTabBadge]}>
            <Text style={[styles.tabBadgeText, filter === 'completed' && styles.activeTabBadgeText]}>
              {counts.completed}
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#2563EB',
    fontWeight: '700',
  },
  tabBadge: {
    marginLeft: 6,
    backgroundColor: 'rgba(100, 116, 139, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  activeTabBadge: {
    backgroundColor: '#DBEAFE',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  activeTabBadgeText: {
    color: '#2563EB',
  },
});
