using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class ToolSwitchParameter : MonoBehaviour
{

    public FMODUnity.EventReference toolControlEvent;
    public FMOD.Studio.EventInstance toolControlInstance;
    public int toolChosen; //0=Brush, 1= Camera, 2= Light, 3=BugSpray
    //public gameObject toolIndex;
    
    
    // Start is called before the first frame update
    void Start()
    {
        toolControlInstance = FMODUnity.RuntimeManager.CreateInstance(toolControlEvent);
        
    }

    // Update is called once per frame
    void Update()
    {
        
    }

    void OnTriggerEnter(Collider other) {

            if(gameObject.tag == "PickUp"){

            
            toolChosen = 2;
            toolControlInstance.setParameterByName("ToolSet", toolChosen);
            Debug.Log("ToolSwitch is working, at least it plays");

            

        }
    }

    // void SwitchToolSound(){

    //     if(gameObject.tag == "PickUp"){

    //         // if(spawnType = toolChosen){

    //         // toolControlInstance.setParameterByName("ToolSet", toolChosen);
    //         // Debug.Log("ToolSwitch is working, at least it plays");

    //         // }

            

            

    //     }


    // }

    
    

    
}
