using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using FMODUnity;

public class AmbienceHoveringFMOD : MonoBehaviour
{

    public FMODUnity.EventReference hoverAmb;
    

    public FMOD.Studio.EventInstance hoverInst;
    
    


    // Start is called before the first frame update
    void Start()
    {
        hoverInst = FMODUnity.RuntimeManager.CreateInstance(hoverAmb);
        FMODUnity.RuntimeManager.AttachInstanceToGameObject(hoverInst, transform);

    }

    // Update is called once per frame
    void Update()
    {
        
    }

     public void OnMouseEnter()
    {
        hoverInst.start();
        Debug.Log("Mouse is In");
    }

     public void OnMouseExit()
    {
        hoverInst.stop(FMOD.Studio.STOP_MODE.IMMEDIATE);
        Debug.Log("Mouse is Out");

    }

    public void OnDestroy()
    {
        hoverInst.release();
    }
}
