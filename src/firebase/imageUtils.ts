import * as ImageManipulator from "expo-image-manipulator";

export async function compressToBase64(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 300, height: 300 } }],
    { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return `data:image/jpeg;base64,${result.base64}`;
}
