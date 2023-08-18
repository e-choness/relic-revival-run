using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class CameraOffset : MonoBehaviour
{
    [SerializeField] Vector3 CamOffset;
    // Start is called before the first frame update
    void Start()
    {
        StartCoroutine(CamCoroutine());
    }

    IEnumerator CamCoroutine()
    {
        yield return new WaitForSeconds(0.05f);
        transform.position = CamOffset;
    }
}
