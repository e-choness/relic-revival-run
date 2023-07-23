using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

public class ToolSelector : MonoBehaviour
{
    [SerializeField] private List<GameObject> tools;
    [SerializeField] InputActionAsset playerInputActionAsset;
    private InputActionMap _playerInputActionMap;
    private InputAction _selectToolsInputAciton;
    // Start is called before the first frame update
    void Start()
    {
        tools[0].SetActive(true);
        tools[0].transform.position = transform.position;
    }

    private void Awake()
    {
        playerInputActionAsset.FindActionMap("Player");
        _selectToolsInputAciton = _playerInputActionMap.FindAction("SelectTools");
    }

    private void OnEnable()
    {
        _selectToolsInputAciton.Enable();
        _selectToolsInputAciton.performed += HandleSelectTools;
    }

    private void OnDisable()
    {
        _selectToolsInputAciton.Disable();
        _selectToolsInputAciton.performed -= HandleSelectTools;
    }

    private void HandleSelectTools(InputAction.CallbackContext context)
    {
        
    }
}
