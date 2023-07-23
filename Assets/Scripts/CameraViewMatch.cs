// using System.Collections;
// using System.Collections.Generic;
// using UnityEngine;
// using UnityEditor;
//
// [CustomEditor(typeof(Camera))]
// public class CameraViewMatch : Editor
// {
//     private Camera _camera;
//
//     private void OnEnable()
//     {
//         _camera = (Camera)target;
//     }
//
//     public override void OnInspectorGUI()
//     {
//         if (GUILayout.Button("Align with editor view"))
//         {
//             var sceneCamera = SceneView.lastActiveSceneView;
//             _camera.transform.position = sceneCamera.camera.transform.position;
//             _camera.transform.rotation = sceneCamera.camera.transform.rotation;
//         }
//         base.OnInspectorGUI();
//     }
// }
