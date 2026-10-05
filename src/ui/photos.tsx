import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { PhotoUpload } from '../api/types';
import { toast } from '../store/toast';
import { neutral, useTheme } from '../theme/tokens';
import { Icon } from './Icon';
import { T } from './T';

export interface PickedPhoto {
  /** Where it is on the phone, to show it. */
  uri: string;
  upload: PhotoUpload;
}

/**
 * Photos off the phone, shrunk on the way in: a return claim needs to show a
 * dent, not carry twelve megapixels over a phone signal.
 */
export function usePhotos(max: number) {
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);

  const take = async (from: 'camera' | 'gallery') => {
    const room = max - photos.length;
    if (room <= 0) return toast(`Up to ${max} photos.`);

    const permission =
      from === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return toast(from === 'camera' ? 'Allow the camera to take a photo.' : 'Allow photos to pick one.');
    }

    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.5, base64: true };
    const result =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync({ ...options, allowsMultipleSelection: true, selectionLimit: room });
    if (result.canceled) return;

    const picked = result.assets
      .filter((a) => !!a.base64)
      .slice(0, room)
      .map((a, i) => ({
        uri: a.uri,
        upload: { name: a.fileName ?? `photo-${Date.now()}-${i}.jpg`, mime: a.mimeType ?? 'image/jpeg', data: a.base64 as string },
      }));
    setPhotos((old) => [...old, ...picked]);
  };

  const remove = (uri: string) => setPhotos((old) => old.filter((p) => p.uri !== uri));
  const clear = () => setPhotos([]);
  return { photos, take, remove, clear };
}

interface StripProps {
  photos: PickedPhoto[];
  max: number;
  onTake: (from: 'camera' | 'gallery') => void;
  onRemove: (uri: string) => void;
}

/** The picked photos in a row, with Camera and Gallery tiles while there is room. */
export function PhotoStrip({ photos, max, onTake, onRemove }: StripProps) {
  const t = useTheme();
  const tile = { width: 64, height: 64, borderRadius: 8 } as const;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {photos.map((p) => (
        <View key={p.uri} style={tile}>
          <Image source={{ uri: p.uri }} contentFit="cover" style={[tile, { borderWidth: 1, borderColor: neutral.ln }]} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove photo"
            hitSlop={8}
            onPress={() => onRemove(p.uri)}
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: neutral.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon name="close" size={11} color="#fff" stroke={2.4} />
          </Pressable>
        </View>
      ))}
      {photos.length < max
        ? (['camera', 'gallery'] as const).map((from) => (
            <Pressable
              key={from}
              accessibilityRole="button"
              accessibilityLabel={from === 'camera' ? 'Take a photo' : 'Choose from gallery'}
              onPress={() => onTake(from)}
              style={[
                tile,
                {
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: t.accLn,
                  backgroundColor: t.accSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                },
              ]}>
              <Icon name={from === 'camera' ? 'plus' : 'grid'} size={16} color={t.accInk} />
              <T w={500} s={10} c={t.accInk}>
                {from === 'camera' ? 'Camera' : 'Gallery'}
              </T>
            </Pressable>
          ))
        : null}
    </View>
  );
}
