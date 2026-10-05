import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/**
 * Put a file the shop sent (an invoice) on the phone and hand it to the
 * system, which offers the apps that can open or save it.
 */
export async function openFile(name: string, base64: string, mime: string): Promise<void> {
  if (Platform.OS === 'web') {
    // The browser preview: show it in a new tab.
    const bytes = Uint8Array.from(globalThis.atob(base64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
    globalThis.open(url, '_blank');
    return;
  }
  const uri = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: name, UTI: 'com.adobe.pdf' });
}
