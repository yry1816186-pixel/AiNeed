import IoniconsBase from 'react-native-vector-icons/Ionicons';
import MaterialIconsBase from 'react-native-vector-icons/MaterialIcons';
import FontAwesomeBase from 'react-native-vector-icons/FontAwesome';
import FontAwesome5Base from 'react-native-vector-icons/FontAwesome5';
import FontAwesome6Base from 'react-native-vector-icons/FontAwesome6';
import MaterialCommunityIconsBase from 'react-native-vector-icons/MaterialCommunityIcons';
import EntypoBase from 'react-native-vector-icons/Entypo';
import EvilIconsBase from 'react-native-vector-icons/EvilIcons';
import FeatherBase from 'react-native-vector-icons/Feather';
import FoundationBase from 'react-native-vector-icons/Foundation';
import OcticonsBase from 'react-native-vector-icons/Octicons';
import SimpleLineIconsBase from 'react-native-vector-icons/SimpleLineIcons';
import ZocialBase from 'react-native-vector-icons/Zocial';
import AntDesignBase from 'react-native-vector-icons/AntDesign';
import FontistoBase from 'react-native-vector-icons/Fontisto';

type IconWithGlyphMap<T> = T & {
  glyphMap: Record<string, number>;
};

function withGlyphMap<T extends object>(IconComponent: T): IconWithGlyphMap<T> {
  const iconWithLookup = IconComponent as T & {
    getRawGlyphMap?: () => Record<string, number>;
    glyphMap?: Record<string, number>;
  };

  const glyphMap = iconWithLookup.getRawGlyphMap?.() ?? iconWithLookup.glyphMap ?? {};

  return Object.assign(IconComponent, { glyphMap }) as IconWithGlyphMap<T>;
}

export const Ionicons = withGlyphMap(IoniconsBase);
export const MaterialIcons = withGlyphMap(MaterialIconsBase);
export const FontAwesome = withGlyphMap(FontAwesomeBase);
export const FontAwesome5 = withGlyphMap(FontAwesome5Base);
export const FontAwesome6 = withGlyphMap(FontAwesome6Base);
export const MaterialCommunityIcons = withGlyphMap(MaterialCommunityIconsBase);
export const Entypo = withGlyphMap(EntypoBase);
export const EvilIcons = withGlyphMap(EvilIconsBase);
export const Feather = withGlyphMap(FeatherBase);
export const Foundation = withGlyphMap(FoundationBase);
export const Octicons = withGlyphMap(OcticonsBase);
export const SimpleLineIcons = withGlyphMap(SimpleLineIconsBase);
export const Zocial = withGlyphMap(ZocialBase);
export const AntDesign = withGlyphMap(AntDesignBase);
export const Fontisto = withGlyphMap(FontistoBase);

export type Icon = typeof Ionicons;
