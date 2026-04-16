const fs = require('fs');
const path = require('path');

const filePath = 'apps/mobile/src/navigation/MainStackNavigator.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  ['../screens/OutfitPlanScreen', '../features/stylist/screens/OutfitPlanScreen'],
  ['../screens/ChatHistoryScreen', '../features/stylist/screens/ChatHistoryScreen'],
  ['../screens/AiStylistChatScreen', '../features/stylist/screens/AiStylistChatScreen'],
  ['../screens/TryOnResultScreen', '../features/tryon/screens/TryOnResultScreen'],
  ['../screens/PaymentScreen', '../features/commerce/screens/PaymentScreen'],
  ['../screens/PostDetailScreen', '../features/community/screens/PostDetailScreen'],
  ['../screens/CreatePostScreen', '../features/community/screens/CreatePostScreen'],
  ['../screens/InfluencerProfileScreen', '../features/community/screens/InfluencerProfileScreen'],
  ['../screens/InspirationWardrobeScreen', '../features/community/screens/InspirationWardrobeScreen'],
  ['../screens/CustomizationEditorScreen', '../features/customization/screens/CustomizationEditorScreen'],
  ['../screens/BrandScreen', '../features/wardrobe/screens/BrandScreen'],
  ['../screens/home/HomeScreen', '../features/home/screens/HomeScreen'],
  ['../screens/SearchScreen', '../features/search/screens/SearchScreen'],
  ['../screens/NotificationsScreen', '../features/notifications/screens/NotificationsScreen'],
  ['../screens/RecommendationDetailScreen', '../features/home/screens/RecommendationDetailScreen'],
  ['../screens/ClothingDetailScreen', '../features/wardrobe/screens/ClothingDetailScreen'],
  ['../screens/OutfitDetailScreen', '../features/stylist/screens/OutfitDetailScreen'],
  ['../screens/AiStylistScreen', '../features/stylist/screens/AiStylistScreen'],
  ['../screens/SessionCalendarScreen', '../features/stylist/screens/SessionCalendarScreen'],
  ['../screens/VirtualTryOnScreen', '../features/tryon/screens/VirtualTryOnScreen'],
  ['../components/screens/TryOnHistoryScreen', '../shared/components/screens/TryOnHistoryScreen'],
  ['../screens/CommunityScreen', '../features/community/screens/CommunityScreen'],
  ['../screens/BloggerDashboardScreen', '../features/community/screens/BloggerDashboardScreen'],
  ['../screens/BloggerProfileScreen', '../features/community/screens/BloggerProfileScreen'],
  ['../screens/BloggerProductScreen', '../features/community/screens/BloggerProductScreen'],
  ['../screens/ProfileScreen', '../features/profile/screens/ProfileScreen'],
  ['../screens/ProfileEditScreen', '../features/profile/screens/ProfileEditScreen'],
  ['../screens/BodyAnalysisScreen', '../features/profile/screens/BodyAnalysisScreen'],
  ['../screens/ColorAnalysisScreen', '../features/profile/screens/ColorAnalysisScreen'],
  ['../screens/SharePosterScreen', '../features/profile/screens/SharePosterScreen'],
  ['../screens/style-quiz/StyleQuizScreen', '../features/style-quiz/screens/StyleQuizScreen'],
  ['../screens/WardrobeScreen', '../features/wardrobe/screens/WardrobeScreen'],
  ['../screens/FavoritesScreen', '../features/wardrobe/screens/FavoritesScreen'],
  ['../screens/SettingsScreen', '../features/profile/screens/SettingsScreen'],
  ['../screens/NotificationSettingsScreen', '../features/notifications/screens/NotificationSettingsScreen'],
  ['../screens/SubscriptionScreen', '../features/commerce/screens/SubscriptionScreen'],
  ['../screens/CartScreen', '../features/commerce/screens/CartScreen'],
  ['../screens/CheckoutScreen', '../features/commerce/screens/CheckoutScreen'],
  ['../screens/OrdersScreen', '../features/commerce/screens/OrdersScreen'],
  ['../screens/OrderDetailScreen', '../features/commerce/screens/OrderDetailScreen'],
  ['../screens/AddClothingScreen', '../features/wardrobe/screens/AddClothingScreen'],
  ['../screens/CustomizationScreen', '../features/customization/screens/CustomizationScreen'],
  ['../screens/LegalScreen', '../features/profile/screens/LegalScreen'],
  ['../screens/consultant/AdvisorListScreen', '../features/consultant/screens/AdvisorListScreen'],
  ['../screens/consultant/AdvisorProfileScreen', '../features/consultant/screens/AdvisorProfileScreen'],
  ['../screens/consultant/BookingScreen', '../features/consultant/screens/BookingScreen'],
  ['../screens/consultant/ChatScreen', '../features/consultant/screens/ChatScreen'],
];

let count = 0;
replacements.forEach(([old, rep]) => {
  if (content.includes(old)) {
    content = content.split(old).join(rep);
    count++;
  }
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated ' + count + ' import paths in MainStackNavigator.tsx');
