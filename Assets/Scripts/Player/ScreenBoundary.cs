using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class ScreenBoundary : MonoBehaviour
{
    private Vector2 screenBounds;
    private float objectWidth, objectHeight;
    // Start is called before the first frame update
    private void Start()
    {
        screenBounds = Camera.main.ScreenToWorldPoint(
            new Vector3(
            Screen.width, 
            Screen.height, 
            Camera.main.transform.position.z));
        var bounds = GetComponent<SpriteRenderer>().bounds;
        objectWidth = bounds.size.x/2;
        objectHeight = bounds.size.y/2;
    }

    // Update is called once per frame
    private void LateUpdate()
    {
        var viewPosition = transform.position;
        viewPosition.x = Mathf.Clamp(viewPosition.x, screenBounds.x * -1 + objectWidth, screenBounds.x - objectWidth);
        viewPosition.y = Mathf.Clamp(viewPosition.y,screenBounds.y * -1 + objectHeight, screenBounds.y - objectHeight);
        transform.position = viewPosition;
    }
}
