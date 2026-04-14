import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { theme } from '../../theme';

interface DragSortItem {
  id: string;
  [key: string]: unknown;
}

interface DragSortListProps<T extends DragSortItem> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  onReorder: (newData: T[]) => void;
  keyExtractor: (item: T) => string;
  itemHeight?: number;
}

function DragSortList<T extends DragSortItem>({
  data,
  renderItem,
  onReorder,
  keyExtractor,
  itemHeight = 72,
}: DragSortListProps<T>) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [localData, setLocalData] = useState<T[]>(data);
  const panY = useRef(new Animated.Value(0)).current;
  const itemAnimations = useRef<Animated.Value[]>(
    data.map(() => new Animated.Value(0)),
  ).current;

  // Sync local data when prop changes
  React.useEffect(() => {
    setLocalData(data);
    // Ensure animations array matches data length
    while (itemAnimations.length < data.length) {
      itemAnimations.push(new Animated.Value(0));
    }
  }, [data]);

  const moveItem = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newData = [...localData];
      const [movedItem] = newData.splice(fromIndex, 1);
      newData.splice(toIndex, 0, movedItem);
      setLocalData(newData);
      onReorder(newData);
    },
    [localData, onReorder],
  );

  const createPanResponder = useCallback(
    (index: number) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          return Math.abs(gestureState.dy) > 10;
        },
        onPanResponderGrant: () => {
          setActiveIndex(index);
          panY.setValue(0);
          Animated.spring(itemAnimations[index], {
            toValue: 1,
            useNativeDriver: true,
            tension: 150,
            friction: 10,
          }).start();
        },
        onPanResponderMove: (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          panY.setValue(gestureState.dy);

          // Calculate potential new position
          const currentY = index * itemHeight + gestureState.dy;
          const newIndex = Math.max(0, Math.min(localData.length - 1, Math.round(currentY / itemHeight)));

          if (newIndex !== index) {
            // Animate other items to make room
            localData.forEach((_, i) => {
              if (i === index) return;
              const targetOffset =
                i >= Math.min(index, newIndex) && i <= Math.max(index, newIndex)
                  ? (i < newIndex ? -itemHeight : itemHeight)
                  : 0;
              Animated.spring(itemAnimations[i], {
                toValue: targetOffset !== 0 ? 0.5 : 0,
                useNativeDriver: true,
                tension: 200,
                friction: 15,
              }).start();
            });
          }
        },
        onPanResponderRelease: (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          const currentY = index * itemHeight + gestureState.dy;
          const newIndex = Math.max(0, Math.min(localData.length - 1, Math.round(currentY / itemHeight)));

          // Reset all animations
          itemAnimations.forEach((anim) => {
            Animated.spring(anim, {
              toValue: 0,
              useNativeDriver: true,
              tension: 200,
              friction: 15,
            }).start();
          });

          if (newIndex !== index) {
            moveItem(index, newIndex);
          }

          setActiveIndex(null);
          panY.setValue(0);
        },
      }),
    [localData, itemHeight, moveItem, panY, itemAnimations],
  );

  // Pan responders need to be recreated when data changes
  const panResponders = useRef<Map<number, ReturnType<typeof PanResponder.create>>>(
    new Map(),
  ).current;

  localData.forEach((_, index) => {
    if (!panResponders.has(index)) {
      panResponders.set(index, createPanResponder(index));
    }
  });

  return (
    <View style={styles.container}>
      {localData.map((item, index) => {
        const responder = panResponders.get(index);
        const isActive = activeIndex === index;

        const animatedStyle = {
          transform: [
            {
              scale: itemAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.05],
              }),
            },
            {
              translateY: isActive ? panY : itemAnimations[index].interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, itemHeight * 0.3, itemHeight],
              }),
            },
          ],
          opacity: itemAnimations[index].interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.9],
          }),
          zIndex: isActive ? 10 : 1,
          elevation: isActive ? 8 : 2,
        };

        return (
          <Animated.View
            key={keyExtractor(item)}
            style={[styles.itemWrapper, animatedStyle, { height: itemHeight }]}
            {...(responder?.panHandlers ?? {})}
          >
            {renderItem(item, index)}
          </Animated.View>
        );
      })}
    </View>
  );
}

export interface CollectionItem {
  id: string;
  name: string;
  icon: string;
  itemCount: number;
}

interface CollectionDragListProps {
  collections: CollectionItem[];
  onReorder: (collections: CollectionItem[]) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onPress?: (id: string) => void;
}

export const CollectionDragList: React.FC<CollectionDragListProps> = ({
  collections,
  onReorder,
  onEdit,
  onDelete,
  onPress,
}) => {
  const renderCollectionItem = useCallback(
    (item: CollectionItem) => (
      <TouchableOpacity
        style={collectionStyles.card}
        onPress={() => onPress?.(item.id)}
        activeOpacity={0.7}
      >
        <View style={collectionStyles.dragHandle}>
          <Ionicons name="reorder-three-outline" size={20} color={theme.colors.textTertiary} />
        </View>
        <View style={collectionStyles.iconContainer}>
          <Ionicons name={item.icon as 'folder'} size={22} color="#6C5CE7" />
        </View>
        <View style={collectionStyles.info}>
          <Text style={collectionStyles.name}>{item.name}</Text>
          <Text style={collectionStyles.count}>{item.itemCount} 个内容</Text>
        </View>
        <View style={collectionStyles.actions}>
          {onEdit && (
            <TouchableOpacity
              style={collectionStyles.actionBtn}
              onPress={() => onEdit(item.id)}
            >
              <Ionicons name="create-outline" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={collectionStyles.actionBtn}
              onPress={() => onDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    ),
    [onEdit, onDelete, onPress],
  );

  return (
    <DragSortList<CollectionItem & { [key: string]: unknown }>
      data={collections as (CollectionItem & { [key: string]: unknown })[]}
      renderItem={renderCollectionItem}
      onReorder={onReorder}
      keyExtractor={(item) => item.id}
      itemHeight={72}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  itemWrapper: {
    position: 'relative',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
});

const collectionStyles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  dragHandle: {
    padding: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F0EDFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  count: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 8 },
});

export default DragSortList;
