import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import { AppRegistry } from 'react-native';
import App from './App';

configureReanimatedLogger({
  level: ReanimatedLogLevel.error,
  strict: false,
});

AppRegistry.registerComponent('XunO', () => App);
